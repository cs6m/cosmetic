-- =====================================================================
-- GLOWORA — featured section, visits, return reasons, customer bans
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query.
-- Safe to run again.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------
alter table public.customers add column if not exists is_banned boolean not null default false;
alter table public.orders add column if not exists return_reason text not null default '';

-- ---------------------------------------------------------------------
-- 2. Order flow: drop "confirmed". Return only from "on the way", with a note.
--    confirmed -> preparing is still allowed so existing rows can move first.
-- ---------------------------------------------------------------------
create or replace function public.guard_order_flow()
returns trigger language plpgsql set search_path = public as $$
declare ok boolean;
begin
  if new.status = old.status then
    return new;
  end if;
  ok := case old.status
          when 'pending'   then new.status = 'preparing'
          when 'preparing' then new.status = 'out'
          when 'out'       then new.status in ('delivered', 'returned')
          when 'confirmed' then new.status = 'preparing'
          else false
        end;
  if not ok then
    raise exception 'Illegal order status change: % -> %', old.status, new.status using errcode = 'P0001';
  end if;
  if new.status = 'returned' and old.status is distinct from 'returned'
     and length(trim(coalesce(new.return_reason, ''))) < 2 then
    raise exception 'A return reason is required' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

update public.orders
   set status = 'preparing'
 where status = 'confirmed';

do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'orders'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.orders drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'preparing', 'out', 'delivered', 'returned'));

-- ---------------------------------------------------------------------
-- 3. Visitor log. One row is written by the storefront at most every 6 hours.
-- ---------------------------------------------------------------------
create table if not exists public.page_visits (
  id         uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  page_path  text not null default '/',
  user_id    uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists page_visits_created_idx on public.page_visits (created_at desc);
create index if not exists page_visits_visitor_idx on public.page_visits (visitor_id, created_at desc);

alter table public.page_visits enable row level security;

drop policy if exists "page visits insert" on public.page_visits;
create policy "page visits insert" on public.page_visits
  for insert to anon, authenticated
  with check (
    page_path !~* '/admin'
    and char_length(page_path) between 1 and 240
  );

drop policy if exists "page visits staff read" on public.page_visits;
create policy "page visits staff read" on public.page_visits
  for select to authenticated
  using (public.is_admin() or public.is_staff() or public.has_permission('overview'));

grant insert on public.page_visits to anon, authenticated;
grant select on public.page_visits to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'page_visits'
  ) then
    alter publication supabase_realtime add table public.page_visits;
  end if;
end $$;
alter table public.page_visits replica identity full;

-- ---------------------------------------------------------------------
-- 4. Customers cannot clear their own ban. Banned accounts cannot check out.
-- ---------------------------------------------------------------------
create or replace function public.protect_customer_ban()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_admin() or public.has_permission('customers') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_banned := false;
  else
    new.is_banned := old.is_banned;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_customers_ban on public.customers;
create trigger trg_customers_ban before insert or update on public.customers
  for each row execute function public.protect_customer_ban();

create or replace function public.reject_banned_checkout()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.source = 'storefront' and exists (
    select 1
    from public.customers c
    where c.is_banned
      and c.id <> 'guest-store'
      and (
        c.owner_id = auth.uid()
        or c.id = new.customer_id
        or (
          coalesce(new.customer ->> 'phone', '') <> ''
          and c.phone = new.customer ->> 'phone'
        )
      )
  ) then
    raise exception 'BANNED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_orders_banned on public.orders;
create trigger trg_orders_banned before insert on public.orders
  for each row execute function public.reject_banned_checkout();
revoke all on function public.reject_banned_checkout() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Seed the featured homepage section from current best sellers.
--    Admins can add or remove products afterwards from the product editor.
-- ---------------------------------------------------------------------
update public.products
   set sections = sections || array['featured']::text[]
 where 'best-seller' = any (badges)
   and not ('featured' = any (sections));

update public.cms_entries
   set value = 'المنتجات المختارة'
 where key = 'featuredTitleAr'
   and value in ('منتجات مختارة', '"منتجات مختارة"');
