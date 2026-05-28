-- Public catering packs (used by the catering page).

create table public.catering_packs (
  id bigint primary key,
  name text not null,
  serves text not null,
  price text not null,
  description text not null,
  includes jsonb not null default '[]'::jsonb,
  tag text not null,
  tag_bg text not null,
  image_url text,
  sort_order integer not null default 0,
  is_available boolean not null default true
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
