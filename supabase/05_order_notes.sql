-- Glowora: post-delivery order notes.
-- Run this once in the Supabase SQL editor on a database that already has 01–04.
-- Customers can insert one note only after their own order is delivered.
-- Staff with the orders or reviews permission can read every note.

create table if not exists public.order_notes (
  id          text primary key,
  order_id    text not null unique references public.orders(id) on update cascade on delete cascade,
  owner_id    uuid default auth.uid() references auth.users(id) on delete set null,
  author      text not null default '',
  note        text not null check (char_length(note) between 2 and 500),
  created_at  timestamptz not null default now()
);

alter table public.order_notes enable row level security;

drop policy if exists "order notes read" on public.order_notes;
create policy "order notes read" on public.order_notes for select to anon, authenticated
  using (owner_id = auth.uid() or public.has_permission('orders') or public.has_permission('reviews'));

drop policy if exists "order notes after delivery" on public.order_notes;
create policy "order notes after delivery" on public.order_notes for insert to anon, authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.owner_id = auth.uid() and o.status = 'delivered'
    )
  );

grant select, insert on public.order_notes to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_notes'
  ) then
    alter publication supabase_realtime add table public.order_notes;
  end if;
end $$;

alter table public.order_notes replica identity full;

-- Banner destinations stay in public.banners.link (no new column).
-- The admin selector stores one of:
--   section:black-friday | section:new-products | section:weekly-offers | section:shop-categories
--   category:<category id>
--   product:<product id>
--   https://...
