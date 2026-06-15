-- Shipping-origin stores may be hidden from public UI (is_active = false) but must
-- still be readable for wholesale freight quoting.

drop policy if exists "Anyone can read active store locations" on public.store_locations;

create policy "Anyone can read active store locations"
  on public.store_locations
  for select
  to anon, authenticated
  using (is_active = true or is_invoice_creator = true or is_shipping = true);

comment on column public.store_locations.is_active is
  'When true, the store is shown in public UI (store finder, pickup selection). Does not affect shipping origin or invoice roles.';

comment on column public.store_locations.is_shipping is
  'When true, this location is used as the courier sender for wholesale shipping quotes (may be hidden from public UI).';
