-- =====================================================================
-- GLOWORA — delete every current order and restart numbering at GL-001
-- Run once in: Supabase Dashboard → SQL Editor → New query.
-- Next orders: GL-001, GL-002, … GL-999, GL-1000, GL-10005
-- =====================================================================

do $$
begin
  if to_regclass('public.order_notes') is not null then
    delete from public.order_notes;
  end if;
end $$;

delete from public.orders;

create or replace function public.next_order_id()
returns text language sql security definer set search_path = public as $$
  select 'GL-' || lpad(nextval('public.order_number_seq')::text, 3, '0');
$$;

select setval('public.order_number_seq', 1, false);
