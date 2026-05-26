-- Public store locations (for store finder + pickup selection).
--
-- Seed is sourced from `refs/samples/store-locations.json`.

create table public.store_locations (
  id bigint primary key,
  name text not null,
  address text not null,
  suburb text,
  lat text,
  lng text,
  phone text,
  hours text,
  is_active boolean not null default true,
  delivery_url text,
  is_franchise boolean not null default false,
  franchise_owner_name text,
  franchise_owner_email text,
  stripe_connect_account_id text,
  stripe_connect_status text,
  platform_fee_percent text
);

comment on table public.store_locations is
  'Store locations shown on the public site (stores + pickup selection).';

create index store_locations_is_active_idx
  on public.store_locations (is_active);

alter table public.store_locations enable row level security;

-- Public can view active store locations
create policy "Anyone can read active store locations"
  on public.store_locations
  for select
  to anon, authenticated
  using (is_active = true);

grant select on public.store_locations to anon, authenticated;

-- Authenticated CRUD for admins
grant insert, update, delete on public.store_locations to authenticated;
grant all on public.store_locations to service_role;

-- Admin CRUD
create policy "Admins can read all store locations"
  on public.store_locations
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert store locations"
  on public.store_locations
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update store locations"
  on public.store_locations
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete store locations"
  on public.store_locations
  for delete
  to authenticated
  using (public.is_admin());

-- Seed from refs/samples/store-locations.json
insert into public.store_locations (
  id,
  name,
  address,
  suburb,
  lat,
  lng,
  phone,
  hours,
  is_active,
  delivery_url,
  is_franchise,
  franchise_owner_name,
  franchise_owner_email,
  stripe_connect_account_id,
  stripe_connect_status,
  platform_fee_percent
)
values
  (
    30001,
    'SGE North Hobart',
    '335 Elizabeth Street, North Hobart TAS 7000',
    'North Hobart',
    '-42.8721000',
    '147.3197000',
    '(03) 6231 6115',
    '{"mon":"11:00 AM - 8:30 PM","tue":"11:00 AM - 8:30 PM","wed":"11:00 AM - 8:30 PM","thu":"11:00 AM - 8:30 PM","fri":"11:00 AM - 8:30 PM","sat":"11:00 AM - 8:30 PM","sun":"11:00 AM - 8:30 PM"}',
    true,
    'https://saigonexpressrestaurant.com.au/order-now',
    false,
    null,
    null,
    null,
    'not_connected',
    '5.00'
  ),
  (
    30002,
    'Saigon Lounge & Bar',
    '329 Elizabeth St, North Hobart TAS 7000',
    'North Hobart',
    '-42.8724000',
    '147.3193000',
    '(03) 6240 3335',
    '{"mon":"12:00 PM - 9:00 PM","tue":"12:00 PM - 9:00 PM","wed":"12:00 PM - 9:00 PM","thu":"12:00 PM - 9:00 PM","fri":"12:00 PM - 9:00 PM","sat":"12:00 PM - 9:00 PM","sun":"12:00 PM - 9:00 PM"}',
    true,
    'https://saigonnorthhobart.com.au/order-now',
    false,
    null,
    null,
    null,
    'not_connected',
    '5.00'
  ),
  (
    30003,
    'SGE CBD',
    '95 Liverpool Street, Hobart TAS 7000',
    'Hobart CBD',
    '-42.8826000',
    '147.3257000',
    '(03) 6288 7234',
    '{"mon":"11:00 AM - 8:30 PM","tue":"11:00 AM - 8:30 PM","wed":"11:00 AM - 8:30 PM","thu":"11:00 AM - 8:30 PM","fri":"11:00 AM - 8:30 PM","sat":"11:00 AM - 8:30 PM","sun":"11:00 AM - 8:30 PM"}',
    true,
    'https://saigonexpresshobart.com.au/order-now',
    false,
    null,
    null,
    null,
    'not_connected',
    '5.00'
  ),
  (
    30004,
    'SGE Sandy Bay',
    'Shop 4, 236 Sandy Bay Road, Sandy Bay TAS 7005',
    'Sandy Bay',
    '-42.9005000',
    '147.3208000',
    '(03) 6223 2288',
    '{"mon":"11:00 AM - 8:30 PM","tue":"11:00 AM - 8:30 PM","wed":"11:00 AM - 8:30 PM","thu":"11:00 AM - 8:30 PM","fri":"11:00 AM - 8:30 PM","sat":"11:00 AM - 8:30 PM","sun":"11:00 AM - 8:30 PM"}',
    true,
    'https://saigonexpresssandybay.com.au/order-now',
    false,
    null,
    null,
    null,
    'not_connected',
    '5.00'
  ),
  (
    30005,
    'SGE Kingston',
    'Shop 10/20 Channel Hwy, Kingston TAS 7050',
    'Kingston',
    '-42.9778000',
    '147.3082000',
    '(03) 6229 9446',
    '{"mon":"11:00 AM - 8:30 PM","tue":"11:00 AM - 8:30 PM","wed":"11:00 AM - 8:30 PM","thu":"11:00 AM - 8:30 PM","fri":"11:00 AM - 8:30 PM","sat":"11:00 AM - 8:30 PM","sun":"11:00 AM - 8:30 PM"}',
    true,
    'https://saigonkingston.com.au/order-now',
    false,
    null,
    null,
    null,
    'not_connected',
    '5.00'
  ),
  (
    30006,
    'SGE Glebe Hill',
    'Shop T5, 1 Commerce Drive, Glebe Hill Village, Howrah TAS 7018',
    'Howrah',
    '-42.8647000',
    '147.3763000',
    '(03) 6247 8869',
    '{"mon":"11:00 AM - 8:30 PM","tue":"11:00 AM - 8:30 PM","wed":"11:00 AM - 8:30 PM","thu":"11:00 AM - 8:30 PM","fri":"11:00 AM - 8:30 PM","sat":"11:00 AM - 8:30 PM","sun":"11:00 AM - 8:30 PM"}',
    true,
    'https://saigonglebehillvillage.com.au/order-now',
    false,
    null,
    null,
    null,
    'not_connected',
    '5.00'
  ),
  (
    30007,
    'SGE Sorell',
    '12a Gordon St, Sorell TAS 7172',
    'Sorell',
    '-42.7787000',
    '147.5640000',
    '(03) 6112 0404',
    '{"mon":"11:00 AM - 8:30 PM","tue":"11:00 AM - 8:30 PM","wed":"11:00 AM - 8:30 PM","thu":"11:00 AM - 8:30 PM","fri":"11:00 AM - 8:30 PM","sat":"11:00 AM - 8:30 PM","sun":"11:00 AM - 8:30 PM"}',
    true,
    'https://saigonexpressgordonsorell.com.au/order-now',
    false,
    null,
    null,
    null,
    'not_connected',
    '5.00'
  ),
  (
    30008,
    'SGE Gateway',
    'Shop 17, Gateway Shopping Centre, 27 Cole St, Sorell TAS 7172',
    'Sorell',
    '-42.7802000',
    '147.5651000',
    '0468 456 959',
    '{"mon":"11:00 AM - 8:30 PM","tue":"11:00 AM - 8:30 PM","wed":"11:00 AM - 8:30 PM","thu":"11:00 AM - 8:30 PM","fri":"11:00 AM - 8:30 PM","sat":"11:00 AM - 8:30 PM","sun":"11:00 AM - 8:30 PM"}',
    true,
    'https://saigonexpressgateway.com.au/order-now',
    false,
    null,
    null,
    null,
    'not_connected',
    '5.00'
  )
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address,
  suburb = excluded.suburb,
  lat = excluded.lat,
  lng = excluded.lng,
  phone = excluded.phone,
  hours = excluded.hours,
  is_active = excluded.is_active,
  delivery_url = excluded.delivery_url,
  is_franchise = excluded.is_franchise,
  franchise_owner_name = excluded.franchise_owner_name,
  franchise_owner_email = excluded.franchise_owner_email,
  stripe_connect_account_id = excluded.stripe_connect_account_id,
  stripe_connect_status = excluded.stripe_connect_status,
  platform_fee_percent = excluded.platform_fee_percent;

