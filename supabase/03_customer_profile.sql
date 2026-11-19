-- Glowora customer accounts.
-- Run this once in Supabase → SQL Editor if 01_schema_security_realtime.sql
-- was already applied before Google checkout was added. Safe to run again.
--
-- Also enable Authentication → Providers → Google, and add the site origin
-- (plus http://localhost:5173) under Authentication → URL configuration → Redirect URLs.

alter table public.customers add column if not exists neighborhood text not null default '';
alter table public.customers add column if not exists street text not null default '';
alter table public.customers add column if not exists building text not null default '';
alter table public.customers add column if not exists address_details text not null default '';

create unique index if not exists customers_owner_key on public.customers (owner_id) where owner_id is not null;

drop policy if exists "customers checkout insert" on public.customers;
create policy "customers checkout insert" on public.customers for insert to anon, authenticated
  with check (
    public.is_admin()
    or public.has_permission('customers')
    or (
      owner_id = auth.uid()
      and coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true'
    )
  );

drop policy if exists "customers checkout update" on public.customers;
create policy "customers checkout update" on public.customers for update to anon, authenticated
  using (
    public.is_admin()
    or public.has_permission('customers')
    or (
      owner_id = auth.uid()
      and coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true'
    )
  )
  with check (
    public.is_admin()
    or public.has_permission('customers')
    or (
      owner_id = auth.uid()
      and coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true'
    )
  );

drop policy if exists "orders checkout insert" on public.orders;
create policy "orders checkout insert" on public.orders for insert to anon, authenticated
  with check (
    public.is_admin()
    or public.has_permission('orders')
    or (
      status = 'pending'
      and source = 'storefront'
      and owner_id = auth.uid()
      and coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true'
    )
  );
