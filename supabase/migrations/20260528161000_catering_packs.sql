-- Public catering packs (used by the catering page).

create table public.catering_packs (
  id bigint primary key,
  name text not null,
  serves text,
  price text default '',
  description text not null default '',
  includes jsonb not null default '[]'::jsonb,
  tag text not null default '',
  tag_bg text not null default '',
  image_url text,
  sort_order integer not null default 0,
  is_available boolean not null default true,  
  image_urls jsonb not null default '{}'::jsonb,
  category text not null default 'Catering Packs',
  note text,
  prices jsonb not null default '[]'::jsonb,  
);

comment on table public.catering_packs is
  'Catering packs shown on the public catering page.';

create index catering_packs_is_available_sort_order_idx
  on public.catering_packs (is_available, sort_order, id);

alter table public.catering_packs enable row level security;

create policy "Anyone can read available catering packs"
  on public.catering_packs
  for select
  to anon, authenticated
  using (is_available = true);

grant select on public.catering_packs to anon, authenticated;
grant insert, update, delete on public.catering_packs to authenticated;
grant all on public.catering_packs to service_role;

-- Admin CRUD
create policy "Admins can read all catering packs"
  on public.catering_packs
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert catering packs"
  on public.catering_packs
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update catering packs"
  on public.catering_packs
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete catering packs"
  on public.catering_packs
  for delete
  to authenticated
  using (public.is_admin());

insert into public.catering_packs (
  id,
  name,
  serves,
  price,
  description,
  includes,
  tag,
  tag_bg,
  image_url,
  sort_order,
  is_available
)
values
  (
    610001,
    'Office Starter Pack',
    '10–20 guests',
    'From $8.50/person',
    'A selection of our signature bánh mì, fresh spring rolls, and homemade drinks — perfect for team lunches and morning meetings.',
    '["Choice of 3 bánh mì varieties", "Fresh rice paper rolls", "Homemade lemongrass drinks", "Napkins & serving trays"]'::jsonb,
    'MOST POPULAR',
    'bg-brand-red',
    '/manus-storage/banh-mi-1_9ba4dcf0.jpg',
    0,
    true
  ),
  (
    610002,
    'Event Feast Pack',
    '30–60 guests',
    'From $12/person',
    'A full Vietnamese spread with bánh mì, phở, bún bowls, and entrée platters — ideal for corporate events, birthdays, and celebrations.',
    '["Full bánh mì bar (5 varieties)", "Phở or bún bowl station", "Entrée platters", "Dessert rice paper rolls", "Full service setup"]'::jsonb,
    'BEST VALUE',
    'bg-brand-amber',
    '/manus-storage/pho-1_92a9985e.jpg',
    1,
    true
  ),
  (
    610003,
    'Corporate Catering',
    '50–200 guests',
    'Custom quote',
    'Tailored menus for large corporate functions, conferences, and gala dinners. Includes dedicated staff, full setup, and branded presentation.',
    '["Fully customised menu", "Dedicated catering staff", "Premium branded presentation", "Dietary accommodations", "Post-event cleanup"]'::jsonb,
    'PREMIUM',
    'bg-brand-dark',
    '/manus-storage/bun-bowl-1_3b12ea6c.jpg',
    2,
    true
  ),
  (
    610004,
    'Custom Pack',
    'Any size',
    'Get a quote',
    'Have something specific in mind? We''ll build a package around your event, dietary needs, and budget. No event is too big or too small.',
    '["Fully flexible menu", "Any dietary requirement", "Any event size", "Delivery or pick-up", "Personal consultation"]'::jsonb,
    'FLEXIBLE',
    'bg-brand-dark/70',
    '/manus-storage/spring-rolls-1_02f22814.jpg',
    3,
    true
  )
on conflict (id) do update set
  name = excluded.name,
  serves = excluded.serves,
  price = excluded.price,
  description = excluded.description,
  includes = excluded.includes,
  tag = excluded.tag,
  tag_bg = excluded.tag_bg,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order,
  is_available = excluded.is_available;


insert into public.catering_packs (
  id,
  category,
  name,
  price,
  serves,
  includes,
  note,
  prices,
  image_url,
  sort_order,
  is_available
)
values
  (
    620001,
    'Catering Boxes',
    'Saigon Feast Box',
    '$160',
    '8–10 People',
    '["8 x Mini Bowls", "8 x Fresh Rice Paper Rolls cut in half", "6 x Mini Banh Mi", "4 x Bao Buns"]'::jsonb,
    null,
    '[]'::jsonb,
    '/manus-storage/SaigonFeastBox_6c26a5d8.jpg',
    0,
    true
  ),
  (
    620002,
    'Catering Boxes',
    'Rice Paper Roll Box',
    '$130',
    '8–10 People',
    '["28 x Standard Saigon RPR served with a variety of delicious sauces"]'::jsonb,
    null,
    '[]'::jsonb,
    '/manus-storage/Ricepaperrollplatter_b21700d4.jpg',
    1,
    true
  ),
  (
    620003,
    'Catering Boxes',
    'Spring Roll Box',
    '$115',
    '6–8 People',
    '["20 x Vegan Spring Roll", "30 x Seafood Spring Roll"]'::jsonb,
    null,
    '[]'::jsonb,
    '/manus-storage/Springrollplatter_c7f62c18.jpg',
    2,
    true
  ),
  (
    620004,
    'Catering Boxes',
    'Mixed Entrée Box',
    '$115',
    '6–8 People',
    '["10 x Vegan Spring Roll", "10 x Seafood Spring Roll", "10 x Prawn Toast", "10 x Fried Pork and Chive Dumpling"]'::jsonb,
    null,
    '[]'::jsonb,
    '/manus-storage/MixedEntreePlatter_983d3d92.jpg',
    3,
    true
  ),
  (
    620005,
    'Catering Boxes',
    'Saigon Lunch Box',
    '$140',
    '6–8 People',
    '["10 x Mixed Mini Bowls", "10 x Mixed Mini Banh Mi"]'::jsonb,
    null,
    '[]'::jsonb,
    '/manus-storage/BowlsBox_575d600e.jpg',
    4,
    true
  ),
  (
    620006,
    'Catering Boxes',
    'Steamed Bao Bun Box',
    '$130',
    '6–8 People',
    '["20 x Mixed Bao Buns", "Available in a variety of flavours"]'::jsonb,
    null,
    '[]'::jsonb,
    '/manus-storage/SteamedBaoBunPlatter_3c06d7a4.jpg',
    5,
    true
  ),
  (
    620007,
    'Catering Boxes',
    'Saigon Bánh Mì Box',
    '$150',
    '6–8 People',
    '["30 x Mini Bánh Mì Baguettes", "Available in a variety of flavours"]'::jsonb,
    null,
    '[]'::jsonb,
    '/manus-storage/SaigonBanhMiBox_94e826fc.jpg',
    6,
    true
  ),
  (
    620008,
    'Catering Boxes',
    'Saigon Street Box',
    '$140',
    '6–8 People',
    '["15 x Mixed Mini Bánh Mì", "20 x Mixed Saigon Rolls"]'::jsonb,
    null,
    '[]'::jsonb,
    '/manus-storage/BanhMi&FreshrollsBox_ca58276a.jpg',
    7,
    true
  ),
  (
    620009,
    'Catering Boxes',
    'Mini Bowls Box',
    '$130',
    '8–10 People',
    '["20 x Mini Bowls", "A mix of Gỏi (Viet Salad), Bún (Noodle Salad) and Cơm (Rice)"]'::jsonb,
    null,
    '[]'::jsonb,
    '/manus-storage/MiniBanhMiBox_5a74c97a.jpg',
    8,
    true
  ),
  (
    620010,
    'Hot Dishes & Platters',
    'Saigon Fried Rice',
    null,
    null,
    '[]'::jsonb,
    null,
    '[{"size":"Small","price":"$65","serves":"5–7 People"},{"size":"Medium","price":"$95","serves":"8–12 People"},{"size":"Large","price":"$125","serves":"15–20 People"}]'::jsonb,
    '/manus-storage/SaigonFriedRice_48676d3d.jpg',
    9,
    true
  ),
  (
    620011,
    'Hot Dishes & Platters',
    'Vietnamese Salad',
    null,
    null,
    '[]'::jsonb,
    null,
    '[{"size":"Small","price":"$35","serves":"5–7 People"},{"size":"Medium","price":"$55","serves":"8–12 People"},{"size":"Large","price":"$75","serves":"15–20 People"}]'::jsonb,
    '/manus-storage/VietnameseSalad_cb8a745b.jpg',
    10,
    true
  ),
  (
    620012,
    'Hot Dishes & Platters',
    'Steamed Jasmine Rice',
    null,
    null,
    '[]'::jsonb,
    null,
    '[{"size":"Small","price":"$28","serves":"5–7 People"},{"size":"Medium","price":"$42","serves":"8–12 People"},{"size":"Large","price":"$55","serves":"15–20 People"}]'::jsonb,
    '/manus-storage/SteamedJasmineRice_f5e40e3e.jpg',
    11,
    true
  ),
  (
    620013,
    'Hot Dishes & Platters',
    'Roast Pork Platter',
    null,
    null,
    '[]'::jsonb,
    null,
    '[{"size":"Small","price":"$65","serves":"5–7 People"},{"size":"Medium","price":"$95","serves":"8–12 People"},{"size":"Large","price":"$125","serves":"15–20 People"}]'::jsonb,
    '/manus-storage/RoastPorkPlatter_d7881898.jpg',
    12,
    true
  ),
  (
    620014,
    'Hot Dishes & Platters',
    'Roast Pork & Roast Duck Platter',
    null,
    null,
    '[]'::jsonb,
    null,
    '[{"size":"Small","price":"$95","serves":"5–7 People"},{"size":"Medium","price":"$138","serves":"8–12 People"},{"size":"Large","price":"$180","serves":"15–20 People"}]'::jsonb,
    '/manus-storage/RoastPorkDuckPlatter_739f3dd1.jpg',
    13,
    true
  ),
  (
    620015,
    'Hot Dishes & Platters',
    'Roast Pork & BBQ Pork Platter',
    null,
    null,
    '[]'::jsonb,
    null,
    '[{"size":"Small","price":"$80","serves":"5–7 People"},{"size":"Medium","price":"$118","serves":"8–12 People"},{"size":"Large","price":"$155","serves":"15–20 People"}]'::jsonb,
    '/manus-storage/RoastPorkBBQPorkPlatter_8d0da620.jpg',
    14,
    true
  ),
  (
    620016,
    'Hot Dishes & Platters',
    'Stir-Fried Noodles',
    null,
    null,
    '[]'::jsonb,
    'Choice of: Singapore Noodles · Soft Egg Noodles · Flat Rice Noodles',
    '[{"size":"Small","price":"$82","serves":"5–7 People"},{"size":"Medium","price":"$120","serves":"8–12 People"},{"size":"Large","price":"$158","serves":"15–20 People"}]'::jsonb,
    '/manus-storage/StirFriedNoodles_23279f91.jpg',
    15,
    true
  ),
  (
    620017,
    'Hot Dishes & Platters',
    'Stir-Fried Hot Dish',
    null,
    null,
    '[]'::jsonb,
    null,
    '[{"size":"Small","price":"$82","serves":"5–7 People"},{"size":"Medium","price":"$120","serves":"8–12 People"},{"size":"Large","price":"$158","serves":"15–20 People"}]'::jsonb,
    '/manus-storage/StirFriedHotDish_16c653d6.jpg',
    16,
    true
  ),
  (
    620018,
    'Hot Dishes & Platters',
    'Stir-Fried Mixed Vegetables with Tofu',
    null,
    null,
    '[]'::jsonb,
    null,
    '[{"size":"Small","price":"$60","serves":"5–7 People"},{"size":"Medium","price":"$88","serves":"8–12 People"},{"size":"Large","price":"$115","serves":"15–20 People"}]'::jsonb,
    '/manus-storage/StirFriedVegTofu_5daed2ed.jpg',
    17,
    true
  )
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  price = excluded.price,
  serves = excluded.serves,
  includes = excluded.includes,
  note = excluded.note,
  prices = excluded.prices,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order,
  is_available = excluded.is_available;
