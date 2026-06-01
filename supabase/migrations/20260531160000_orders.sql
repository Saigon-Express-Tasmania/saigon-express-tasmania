-- Customer pickup orders (Stripe checkout + in-store pickup).

create type public.order_status as enum (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled'
);

create type public.payment_status as enum ('unpaid', 'paid', 'refunded');

create table public.orders (
  id bigint generated always as identity primary key,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  store_id bigint references public.store_locations (id),
  pickup_time text not null,
  total numeric(10, 2) not null,
  status public.order_status not null default 'pending',
  stripe_checkout_session_id text,
  stripe_mode text check (stripe_mode in ('test', 'live')),
  payment_status public.payment_status not null default 'unpaid',
  notes text,
  cancel_token text,
  tracking_token text,
  status_updated_at timestamptz,
  receipt_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  menu_item_id bigint not null,
  qty integer not null check (qty >= 1),
  unit_price numeric(8, 2) not null,
  item_name text not null
);

create index orders_store_id_idx on public.orders (store_id);
create index orders_payment_status_idx on public.orders (payment_status);
create index orders_tracking_token_idx on public.orders (tracking_token) where tracking_token is not null;
create index order_items_order_id_idx on public.order_items (order_id);

comment on table public.orders is 'Customer pickup orders placed via the public checkout flow.';
comment on column public.orders.stripe_mode is
  'Stripe payment environment used at checkout (test or live).';
comment on table public.order_items is 'Line items for customer pickup orders.';

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- No public access; edge functions use service_role.
create policy "Service role full access on orders"
  on public.orders
  for all
  to service_role
  using (true)
  with check (true);

create policy "Service role full access on order_items"
  on public.order_items
  for all
  to service_role
  using (true)
  with check (true);

grant all on public.orders to service_role;
grant all on public.order_items to service_role;
