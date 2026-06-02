-- Pre-checkout draft orders used to save unpaid carts.

create table public.draft_orders (
  id bigint generated always as identity primary key,
  customer_name text,
  customer_email text,
  customer_phone text,
  store_id bigint references public.store_locations (id),
  pickup_time text,
  total numeric(10, 2),
  notes text,
  items jsonb not null default '[]'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index draft_orders_store_id_idx on public.draft_orders (store_id);
create index draft_orders_expires_at_idx on public.draft_orders (expires_at);
create index draft_orders_customer_email_idx on public.draft_orders (customer_email) where customer_email is not null;

comment on table public.draft_orders is
  'Temporary unpaid orders saved before checkout is completed.';
comment on column public.draft_orders.items is
  'Snapshot of line items (menu item details, qty, and pricing) before payment.';

alter table public.draft_orders enable row level security;

-- No public access; edge functions use service_role.
create policy "Service role full access on draft_orders"
  on public.draft_orders
  for all
  to service_role
  using (true)
  with check (true);

create policy "Admins full access on draft_orders"
  on public.draft_orders
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant all on public.draft_orders to service_role;
grant select, insert, update, delete on public.draft_orders to authenticated;
