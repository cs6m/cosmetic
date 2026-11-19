-- Guests may place a pending storefront order again.
-- Saved delivery profiles stay limited to a real (non-anonymous) account.
-- Safe to run after 03_customer_profile.sql.

drop policy if exists "orders checkout insert" on public.orders;
create policy "orders checkout insert" on public.orders for insert to anon, authenticated
  with check (
    public.is_admin()
    or public.has_permission('orders')
    or (
      status = 'pending'
      and source = 'storefront'
      and owner_id = auth.uid()
    )
  );
