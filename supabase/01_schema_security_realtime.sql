-- =====================================================================
-- GLOWORA — Supabase schema, security (RLS), triggers, Realtime, Storage
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query.
-- Then run 02_seed_data.sql.
--
-- BEFORE YOU RUN: Authentication → Providers → enable "Anonymous sign-ins".
-- (Guests get an anonymous session so they can place and view *their own* orders.)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 0. Shared helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

-- Team + signed-up users. One row per auth user (created by trigger below).
-- role: admin (everything) | staff (only the permissions listed) | customer (no admin access)
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  name        text not null default '',
  role        text not null default 'customer' check (role in ('admin', 'staff', 'customer')),
  active      boolean not null default true,
  permissions text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists profiles_email_key on public.profiles (lower(email));

create table if not exists public.brands (
  id             text primary key,
  name           text not null,
  mark           text not null default '',
  tone           text not null default 'bg-espresso text-ivory',
  description    text not null default '',
  description_ar text not null default '',
  logo           text not null default '',
  image          text not null default '',
  position       integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.categories (
  id         text primary key,
  name       text not null,
  name_ar    text not null default '',
  image      text not null default '',
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subcategories (
  category_id text not null references public.categories (id) on update cascade on delete cascade,
  id          text not null,
  label       text not null default '',
  name        text not null,
  name_ar     text not null default '',
  image       text not null default '',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (category_id, id)
);

create table if not exists public.badges (
  id         text primary key,
  label      text not null,
  label_ar   text not null default '',
  tone       text not null default 'nude',
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id             text primary key,
  name           text not null,
  name_ar        text not null default '',
  subtitle       text not null default '',
  subtitle_ar    text not null default '',
  sku            text not null,
  brand_id       text references public.brands (id) on update cascade on delete set null,
  category_id    text not null references public.categories (id) on update cascade on delete restrict,
  subcategory_id text,
  price          numeric(14, 2) not null check (price >= 0),
  discount_price numeric(14, 2) check (discount_price is null or (discount_price >= 0 and discount_price < price)),
  description    text not null default '',
  description_ar text not null default '',
  stock          integer not null default 0 check (stock >= 0),
  images         jsonb not null default '[]'::jsonb,     -- array of image URLs
  status         text not null default 'active' check (status in ('active', 'hidden')),
  badge          text,                                    -- legacy label of the first badge
  badges         text[] not null default '{}',            -- badge ids (see public.badges)
  sections       text[] not null default '{}',            -- black-friday | new-products | weekly-offers
  rating         numeric(2, 1) not null default 5,
  reviews        integer not null default 0,
  benefits       jsonb not null default '[]'::jsonb,     -- [{icon, label, labelAr}]
  position       integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint products_subcategory_fk foreign key (category_id, subcategory_id)
    references public.subcategories (category_id, id) on update cascade on delete restrict
);
create unique index if not exists products_sku_key on public.products (lower(sku));
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_brand_idx on public.products (brand_id);
create index if not exists products_status_idx on public.products (status);

-- CRM list managed by the admin (not the same thing as auth users).
create table if not exists public.customers (
  id            text primary key,
  name          text not null,
  email         text not null,
  phone         text not null default '',
  city          text not null default '',
  registered_at timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists customers_email_key on public.customers (lower(email));

create sequence if not exists public.order_number_seq start with 5000;

create table if not exists public.orders (
  id                text primary key,
  placed_at         timestamptz not null default now(),
  status            text not null default 'pending'
                      check (status in ('pending', 'confirmed', 'preparing', 'out', 'delivered', 'returned')),
  -- Order lines are a snapshot of what was bought, at the price paid:
  -- [{id, name, nameAr, image, qty, price}]. They stay valid if a product is later edited or deleted.
  items             jsonb not null default '[]'::jsonb,
  total             numeric(14, 2) not null check (total >= 0),
  subtotal          numeric(14, 2),
  shipping          numeric(14, 2),
  payment           text not null default 'cod' check (payment = 'cod'),
  customer          jsonb,                                  -- checkout form: name, phone, city, address…
  customer_id       text not null default 'guest-store' references public.customers (id) on update cascade on delete restrict,
  source            text not null default 'storefront' check (source in ('admin', 'storefront')),
  inventory_applied boolean not null default false,
  history           jsonb not null default '[]'::jsonb,     -- [{status, at, by}]
  owner_id          uuid default auth.uid() references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists orders_owner_idx on public.orders (owner_id);
create index if not exists orders_placed_idx on public.orders (placed_at desc);
create index if not exists orders_status_idx on public.orders (status);

-- Flattened view of order lines for reports / SQL analysis.
create or replace view public.order_items_v with (security_invoker = true) as
select o.id as order_id,
       (l.value ->> 'id')                          as product_id,
       (l.value ->> 'name')                        as name,
       coalesce((l.value ->> 'qty')::int, 0)       as qty,
       coalesce((l.value ->> 'price')::numeric, 0) as price
from public.orders o
cross join lateral jsonb_array_elements(o.items) as l(value);

create table if not exists public.reviews (
  id         text primary key,
  order_id   text references public.orders (id) on update cascade on delete set null,
  product_id text not null references public.products (id) on update cascade on delete cascade,
  author     text not null,
  rating     integer not null check (rating between 1 and 5),
  text       text not null default '',
  status     text not null default 'pending' check (status in ('pending', 'approved')),
  owner_id   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists reviews_one_per_order_product
  on public.reviews (order_id, product_id) where order_id is not null;
create index if not exists reviews_product_idx on public.reviews (product_id);

create table if not exists public.faqs (
  id          text primary key,
  question    text not null default '',
  answer      text not null default '',
  question_ar text not null default '',
  answer_ar   text not null default '',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.socials (
  id         text primary key,
  label      text not null,
  href       text not null check (href ~* '^https://'),
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.banners (
  id         text primary key,
  image      text not null default '',
  title      text not null default '',
  title_ar   text not null default '',
  text       text not null default '',
  text_ar    text not null default '',
  button     text not null default '',
  button_ar  text not null default '',
  link       text not null default '',
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Page copy (cms) and store settings are key/value so each key can change on its own.
create table if not exists public.cms_entries (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.governorates (
  id             text primary key,
  name_en        text not null,
  name_ar        text not null,
  enabled        boolean not null default true,
  delivery_price numeric(14, 2) not null default 0 check (delivery_price >= 0 and delivery_price <= 1000000),
  position       integer not null default 0,
  updated_at     timestamptz not null default now()
);

create table if not exists public.audit_log (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  email   text not null default 'system',
  message text not null default ''
);
create unique index if not exists audit_log_unique_event on public.audit_log (at, email, message);

-- ---------------------------------------------------------------------
-- 2. Authorization helpers (SECURITY DEFINER so policies can read profiles safely)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.active and p.role = 'admin');
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.active and p.role in ('admin', 'staff'));
$$;

create or replace function public.has_permission(permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active
      and (p.role = 'admin' or (p.role = 'staff' and permission = any (p.permissions)))
  );
$$;

grant execute on function public.is_admin(), public.is_staff(), public.has_permission(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Triggers & functions
-- ---------------------------------------------------------------------

-- 3a. updated_at on every table that has the column
do $$
declare t text;
begin
  foreach t in array array['profiles','brands','categories','subcategories','badges','products','customers',
                           'orders','reviews','faqs','socials','banners','cms_entries','store_settings','governorates']
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s', t);
    execute format('create trigger trg_%1$s_updated_at before update on public.%1$s
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- 3b. Auto-create a profile whenever a real (non-anonymous) user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.is_anonymous, false) then
    return new;                      -- guests don't get a profile
  end if;
  insert into public.profiles (id, email, name, role)
  values (new.id, coalesce(new.email, ''),
          coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
          'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile e-mail in step with auth
create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = coalesce(new.email, email) where id = new.id;
  return new;
end;
$$;
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

-- 3c. Nobody but an admin may change role / active / permissions (not even on their own row)
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;                      -- service role / SQL editor
  end if;
  if not public.is_admin() then
    new.role        := old.role;
    new.active      := old.active;
    new.permissions := old.permissions;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_profiles_protect on public.profiles;
create trigger trg_profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- 3d. Never let the last active admin be removed, demoted or deactivated
create or replace function public.keep_one_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null and current_user not in ('authenticated', 'anon') then
    if tg_op = 'DELETE' then return old; end if;   -- allow maintenance from the SQL editor / service role
    return new;
  end if;
  if (tg_op = 'DELETE' and old.role = 'admin')
     or (tg_op = 'UPDATE' and old.role = 'admin' and (new.role <> 'admin' or not new.active)) then
    if not exists (select 1 from public.profiles where role = 'admin' and active and id <> old.id) then
      raise exception 'At least one active admin is required.' using errcode = 'P0001';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists trg_profiles_keep_admin on public.profiles;
create trigger trg_profiles_keep_admin before update or delete on public.profiles
  for each row execute function public.keep_one_admin();

-- 3e. Unique, server-issued order numbers (used when a client-picked id collides)
create or replace function public.next_order_id()
returns text language sql security definer set search_path = public as $$
  select 'GL-' || nextval('public.order_number_seq')::text;
$$;
grant execute on function public.next_order_id() to anon, authenticated;

-- 3f. Storefront orders are re-priced and validated on the server, so a tampered browser
--     can't invent prices, skip delivery fees or order hidden products.
--     (Admin/staff inserts are trusted and pass through untouched.)
create or replace function public.validate_storefront_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  line     jsonb;
  prod     public.products%rowtype;
  gov      public.governorates%rowtype;
  eff      numeric;
  paid     numeric;
  qty      integer;
  sub      numeric := 0;
  lines    integer := 0;
  phone    text;
begin
  -- trusted callers: team members, the SQL editor and the service role (seeding / maintenance)
  if public.is_staff() or (auth.uid() is null and current_user not in ('anon', 'authenticated')) then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;

  new.owner_id          := auth.uid();
  new.status            := 'pending';
  new.source            := 'storefront';
  new.payment           := 'cod';
  new.customer_id       := 'guest-store';
  new.inventory_applied := false;
  new.placed_at         := now();
  new.history           := jsonb_build_array(jsonb_build_object('status', 'pending', 'at', now(), 'by', 'storefront'));

  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) not between 1 and 50 then
    raise exception 'Order needs between 1 and 50 items' using errcode = '22023';
  end if;

  for line in select value from jsonb_array_elements(new.items) loop
    select * into prod from public.products where id = line ->> 'id' and status = 'active';
    if not found then
      raise exception 'Unknown or unavailable product: %', coalesce(line ->> 'id', '?') using errcode = '22023';
    end if;
    qty  := coalesce((line ->> 'qty')::integer, 0);
    paid := coalesce((line ->> 'price')::numeric, -1);
    if qty < 1 or qty > 20 then
      raise exception 'Invalid quantity' using errcode = '22023';
    end if;
    eff := case when prod.discount_price is not null and prod.discount_price < prod.price
                then prod.discount_price else prod.price end;
    -- allow the storefront's 20% bundle deal, nothing lower
    if paid > eff or paid < floor(eff * 0.8) - 1 then
      raise exception 'Price mismatch for %', prod.id using errcode = '22023';
    end if;
    sub   := sub + paid * qty;
    lines := lines + 1;
  end loop;

  phone := coalesce(new.customer ->> 'phone', '');
  if phone !~ '^07[0-9]{9}$' then
    raise exception 'Phone must start with 07 and have 11 digits' using errcode = '22023';
  end if;

  select * into gov from public.governorates where id = new.customer ->> 'city' and enabled;
  if not found then
    raise exception 'Delivery is not available to this governorate' using errcode = '22023';
  end if;

  new.subtotal := sub;
  new.shipping := gov.delivery_price;
  new.total    := sub + gov.delivery_price;
  return new;
end;
$$;
drop trigger if exists trg_orders_validate on public.orders;
create trigger trg_orders_validate before insert on public.orders
  for each row execute function public.validate_storefront_order();

-- 3g. Order status can only move along the real fulfilment flow; stock can never go negative.
create or replace function public.guard_order_flow()
returns trigger language plpgsql set search_path = public as $$
declare ok boolean;
begin
  if new.status = old.status then
    return new;
  end if;
  ok := case old.status
          when 'pending'   then new.status in ('confirmed', 'returned')
          when 'confirmed' then new.status in ('preparing', 'returned')
          when 'preparing' then new.status in ('out', 'returned')
          when 'out'       then new.status in ('delivered', 'returned')
          when 'delivered' then new.status in ('returned')
          else false
        end;
  if not ok then
    raise exception 'Illegal order status change: % -> %', old.status, new.status using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_orders_flow on public.orders;
create trigger trg_orders_flow before update on public.orders
  for each row execute function public.guard_order_flow();
-- (Stock deduction/restoration on delivered/returned is performed by advanceOrder() in the app and
--  saved in the same batch; the CHECK (stock >= 0) on products is the database-side safety net.)

-- 3h. Keep each product's public rating / review count in step with its approved reviews.
--     (Who may post a review is enforced by the RLS policy "reviews create after delivery".)
create or replace function public.refresh_product_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid text;
begin
  pid := coalesce(new.product_id, old.product_id);
  update public.products p
     set rating  = coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r
                              where r.product_id = pid and r.status = 'approved'), p.rating),
         reviews = case when exists (select 1 from public.reviews r where r.product_id = pid and r.status = 'approved')
                        then (select count(*) from public.reviews r where r.product_id = pid and r.status = 'approved')
                        else p.reviews end
   where p.id = pid;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_reviews_rating on public.reviews;
create trigger trg_reviews_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();

-- ---------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','brands','categories','subcategories','badges','products','customers',
                           'orders','reviews','faqs','socials','banners','cms_entries','store_settings',
                           'governorates','audit_log']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Public catalogue / content: anyone (including guests) can read; only the matching permission can write.
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('brands',        'brands'),
      ('categories',    'categories'),
      ('subcategories', 'categories'),
      ('badges',        'products'),
      ('faqs',          'settings'),
      ('socials',       'settings'),
      ('banners',       'settings'),
      ('cms_entries',   'settings'),
      ('store_settings','settings'),
      ('governorates',  'settings')
    ) as v(tbl, perm)
  loop
    execute format('drop policy if exists "%1$s public read" on public.%1$s', rec.tbl);
    execute format('create policy "%1$s public read" on public.%1$s for select to anon, authenticated using (true)', rec.tbl);
    execute format('drop policy if exists "%1$s admin insert" on public.%1$s', rec.tbl);
    execute format('create policy "%1$s admin insert" on public.%1$s for insert to authenticated with check (public.has_permission(%2$L))', rec.tbl, rec.perm);
    execute format('drop policy if exists "%1$s admin update" on public.%1$s', rec.tbl);
    execute format('create policy "%1$s admin update" on public.%1$s for update to authenticated using (public.has_permission(%2$L)) with check (public.has_permission(%2$L))', rec.tbl, rec.perm);
    execute format('drop policy if exists "%1$s admin delete" on public.%1$s', rec.tbl);
    execute format('create policy "%1$s admin delete" on public.%1$s for delete to authenticated using (public.has_permission(%2$L))', rec.tbl, rec.perm);
  end loop;
end $$;

-- Brands can also be managed by anyone who manages products (matches saveBrand in the app).
drop policy if exists "brands product managers insert" on public.brands;
create policy "brands product managers insert" on public.brands for insert to authenticated with check (public.has_permission('products'));
drop policy if exists "brands product managers update" on public.brands;
create policy "brands product managers update" on public.brands for update to authenticated using (public.has_permission('products')) with check (public.has_permission('products'));
drop policy if exists "brands product managers delete" on public.brands;
create policy "brands product managers delete" on public.brands for delete to authenticated using (public.has_permission('products'));

-- Products: guests see active ones only; staff see everything.
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products for select to anon, authenticated
  using (status = 'active' or public.is_staff());
drop policy if exists "products admin insert" on public.products;
create policy "products admin insert" on public.products for insert to authenticated with check (public.has_permission('products'));
drop policy if exists "products admin update" on public.products;
create policy "products admin update" on public.products for update to authenticated
  using (public.has_permission('products') or public.has_permission('orders'))
  with check (public.has_permission('products') or public.has_permission('orders'));   -- orders: stock moves on delivery/return
drop policy if exists "products admin delete" on public.products;
create policy "products admin delete" on public.products for delete to authenticated using (public.has_permission('products.delete'));

-- Customers (personal data): staff only.
drop policy if exists "customers staff read" on public.customers;
create policy "customers staff read" on public.customers for select to authenticated using (public.is_staff());
drop policy if exists "customers admin insert" on public.customers;
create policy "customers admin insert" on public.customers for insert to authenticated with check (public.has_permission('customers') or public.has_permission('orders'));
drop policy if exists "customers admin update" on public.customers;
create policy "customers admin update" on public.customers for update to authenticated using (public.has_permission('customers')) with check (public.has_permission('customers'));
drop policy if exists "customers admin delete" on public.customers;
create policy "customers admin delete" on public.customers for delete to authenticated using (public.has_permission('customers'));

-- Orders: a shopper reads/creates only their own; staff manage all.
drop policy if exists "orders read own or staff" on public.orders;
create policy "orders read own or staff" on public.orders for select to anon, authenticated
  using (owner_id = auth.uid() or public.is_staff());
drop policy if exists "orders create own" on public.orders;
create policy "orders create own" on public.orders for insert to anon, authenticated
  with check ((owner_id = auth.uid() and source = 'storefront' and status = 'pending') or public.has_permission('orders'));
drop policy if exists "orders staff update" on public.orders;
create policy "orders staff update" on public.orders for update to authenticated
  using (public.has_permission('orders')) with check (public.has_permission('orders'));
drop policy if exists "orders staff delete" on public.orders;
create policy "orders staff delete" on public.orders for delete to authenticated using (public.has_permission('orders'));

-- Reviews: the public sees approved ones; an author sees their own; moderators see all.
drop policy if exists "reviews read" on public.reviews;
create policy "reviews read" on public.reviews for select to anon, authenticated
  using (status = 'approved' or owner_id = auth.uid() or public.has_permission('reviews'));
drop policy if exists "reviews create after delivery" on public.reviews;
create policy "reviews create after delivery" on public.reviews for insert to anon, authenticated
  with check (
    public.has_permission('reviews')
    or (
      status = 'pending' and owner_id = auth.uid() and order_id is not null
      and exists (
        select 1 from public.orders o
        where o.id = order_id and o.owner_id = auth.uid() and o.status = 'delivered'
          and o.items @> jsonb_build_array(jsonb_build_object('id', product_id))
      )
    )
  );
drop policy if exists "reviews moderate" on public.reviews;
create policy "reviews moderate" on public.reviews for update to authenticated
  using (public.has_permission('reviews')) with check (public.has_permission('reviews'));
drop policy if exists "reviews remove" on public.reviews;
create policy "reviews remove" on public.reviews for delete to authenticated using (public.has_permission('reviews'));

-- Profiles / team: you can read and edit your own; admins manage everyone.
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
drop policy if exists "profiles admin insert" on public.profiles;
create policy "profiles admin insert" on public.profiles for insert to authenticated with check (public.is_admin());
drop policy if exists "profiles admin delete" on public.profiles;
create policy "profiles admin delete" on public.profiles for delete to authenticated using (public.is_admin());

-- Audit trail: staff can read and append; nobody can edit or delete it.
drop policy if exists "audit staff read" on public.audit_log;
create policy "audit staff read" on public.audit_log for select to authenticated using (public.is_staff());
drop policy if exists "audit staff append" on public.audit_log;
create policy "audit staff append" on public.audit_log for insert to authenticated with check (public.is_staff());

-- ---------------------------------------------------------------------
-- 5. Realtime (postgres_changes)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','brands','categories','subcategories','badges','products','customers',
                           'orders','reviews','faqs','socials','banners','cms_entries','store_settings',
                           'governorates','audit_log']
  loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
    execute format('alter table public.%I replica identity full', t);   -- DELETE events carry the full old row
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. Storage: public bucket "media" for admin-uploaded brand / category / product / banner images
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select to anon, authenticated using (bucket_id = 'media');
drop policy if exists "media staff upload" on storage.objects;
create policy "media staff upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_staff());
drop policy if exists "media staff update" on storage.objects;
create policy "media staff update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_staff());
drop policy if exists "media staff delete" on storage.objects;
create policy "media staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_staff());

-- ---------------------------------------------------------------------
-- 7. Grants (RLS still decides which rows are visible/writable)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant insert on public.orders, public.reviews to anon;
grant usage, select on all sequences in schema public to anon, authenticated;
