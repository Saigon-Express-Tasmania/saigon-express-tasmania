-- Public promotions shown on the site (e.g. /promotions page).
--
-- Seed is sourced from `refs/samples/promotions.json`.

create table public.promotions (
  id bigint primary key,
  title text not null,
  description text,
  badge text,
  discount_label text,
  image_url text,
  cta_label text,
  cta_href text,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.promotions is
  'Promotions shown on the public site (homepage/app promo cards and /promotions).';

create index promotions_is_active_sort_order_idx
  on public.promotions (is_active, sort_order, id);

alter table public.promotions enable row level security;

create policy "Anyone can read active promotions"
  on public.promotions
  for select
  to anon, authenticated
  using (is_active = true);

grant select on public.promotions to anon, authenticated;
grant insert, update, delete on public.promotions to authenticated;
grant all on public.promotions to service_role;

-- Admin CRUD
create policy "Admins can read all promotions"
  on public.promotions
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert promotions"
  on public.promotions
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update promotions"
  on public.promotions
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete promotions"
  on public.promotions
  for delete
  to authenticated
  using (public.is_admin());

-- Seed from refs/samples/promotions.json
insert into public.promotions (
  id,
  title,
  description,
  badge,
  discount_label,
  image_url,
  cta_label,
  cta_href,
  starts_at,
  expires_at,
  is_active,
  sort_order,
  created_at,
  updated_at
)
values
  (
    1,
    'App-Only Tuesday Deal',
    'Add Saigon Express to your home screen and get 20% off every Tuesday. Show the app icon at the counter to redeem.',
    'App Only',
    '20% OFF',
    '/manus-storage/banh-mi-2_7d02846f.jpg',
    'Get the App',
    '/#get-the-sg-app',
    null,
    '2026-12-31T23:59:59.000Z'::timestamptz,
    true,
    1,
    '2026-04-28T23:54:44.000Z'::timestamptz,
    '2026-04-28T23:54:44.000Z'::timestamptz
  ),
  (
    2,
    'Loyalty Stamp Bonus',
    'Collect 8 stamps and get a FREE bánh mì of your choice. Double stamps on orders over $15.',
    'Loyalty Reward',
    'FREE ITEM',
    '/manus-storage/banh-mi-1_9ba4dcf0.jpg',
    'Order Now',
    '/menu',
    null,
    '2026-12-31T23:59:59.000Z'::timestamptz,
    true,
    2,
    '2026-04-28T23:54:44.000Z'::timestamptz,
    '2026-04-28T23:54:44.000Z'::timestamptz
  ),
  (
    3,
    'Family Feast Bundle',
    'Order any 4 main dishes and get a free spring roll platter. Perfect for family dinners or office lunches.',
    'Limited Time',
    'FREE PLATTER',
    '/manus-storage/spring-rolls-1_02f22814.jpg',
    'View Menu',
    '/menu',
    null,
    '2026-06-30T23:59:59.000Z'::timestamptz,
    true,
    3,
    '2026-04-28T23:54:44.000Z'::timestamptz,
    '2026-04-28T23:54:44.000Z'::timestamptz
  ),
  (
    4,
    'Student Discount',
    'Show your student ID and enjoy 15% off your order at any Saigon Express location across Tasmania.',
    'Student Deal',
    '15% OFF',
    '/manus-storage/pho-1_92a9985e.jpg',
    'Find a Store',
    '/stores',
    null,
    null,
    true,
    4,
    '2026-04-28T23:54:45.000Z'::timestamptz,
    '2026-04-28T23:59:06.000Z'::timestamptz
  ),
  (
    5,
    'Weekend Pho Special',
    'Every Saturday and Sunday, enjoy a large pho for the price of a regular. Dine-in only.',
    'Weekend Only',
    'UPGRADE FREE',
    '/manus-storage/pho-2_4fc44f9f.jpg',
    'Find a Store',
    '/stores',
    null,
    '2026-12-31T23:59:59.000Z'::timestamptz,
    true,
    5,
    '2026-04-28T23:54:45.000Z'::timestamptz,
    '2026-04-28T23:59:06.000Z'::timestamptz
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  badge = excluded.badge,
  discount_label = excluded.discount_label,
  image_url = excluded.image_url,
  cta_label = excluded.cta_label,
  cta_href = excluded.cta_href,
  starts_at = excluded.starts_at,
  expires_at = excluded.expires_at,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

