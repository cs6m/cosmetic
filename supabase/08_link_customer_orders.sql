-- Storefront checkout was forcing every order onto the guest-store customer,
-- so a signed-in account kept showing 0 orders. This runs after that validation
-- and points the order at the shopper's own customer row.

create or replace function public.link_storefront_customer()
returns trigger language plpgsql security definer set search_path = public as $$
declare buyer text;
begin
  if new.customer_id is distinct from 'guest-store' or new.owner_id is null then
    return new;
  end if;
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    return new;
  end if;
  select c.id into buyer
    from public.customers c
   where c.id <> 'guest-store'
     and (c.id = new.owner_id::text or c.owner_id = new.owner_id)
   order by case when c.id = new.owner_id::text then 0 else 1 end
   limit 1;
  if buyer is not null then
    new.customer_id := buyer;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_z_link_customer on public.orders;
create trigger trg_orders_z_link_customer
  before insert on public.orders
  for each row execute function public.link_storefront_customer();

update public.orders o
set customer_id = c.id
from public.customers c
where o.customer_id = 'guest-store'
  and c.id <> 'guest-store'
  and o.owner_id is not null
  and (c.id = o.owner_id::text or c.owner_id = o.owner_id);
