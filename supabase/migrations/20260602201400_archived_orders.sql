-- Archived orders retained for historical/admin-only access.

create table public.archived_orders (
  id bigint not null primary key,
  is_testing boolean not null default false,
  order_type public.order_type not null,
  status public.order_status not null,
  cancel_token text,
  tracking_token text,

  customer_account uuid references public.user_profiles (id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,

  store_id bigint references public.store_locations (id) on delete set null,
  requested_fulfillment_method public.order_fulfillment_type not null,
  requested_target_date timestamptz not null,

  shipping_address text not null,
  shipping_city text not null,
  shipping_state text not null,
  shipping_postal_code text not null,
  shipping_country text not null,
  
  billing_address text not null,
  billing_city text not null,
  billing_state text not null,
  billing_postal_code text not null,
  billing_country text not null,

  payment_terms public.order_payment_terms not null default 'prepaid',
  po_number varchar(100),
  subtotal numeric(10, 2) not null,
  tax_total numeric(10, 2) not null default 0.00,
  shipping_fee numeric(10, 2) not null default 0.00,
  grand_total numeric(10, 2) not null,
  financial_details jsonb,

  notes text,
  archived_reason text,
  archived_at timestamptz not null default now(),
  status_updated_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index archived_orders_is_testing_idx on public.archived_orders (is_testing);
create index archived_orders_customer_account_idx
  on public.archived_orders (customer_account, archived_at desc)
  where customer_account is not null;
create index archived_orders_archived_at_idx on public.archived_orders (archived_at desc);
create index archived_orders_order_type_idx on public.archived_orders (order_type);

comment on table public.archived_orders is
  'Historical order headers moved out of active orders; child rows stay in shared tables.';
comment on column public.archived_orders.id is
  'Preserved from the source order so order_items, order_payments, and order_fulfillments need not be cloned.';

alter table public.archived_orders enable row level security;

create policy "Service role full access on archived_orders"
  on public.archived_orders
  for all
  to service_role
  using (true)
  with check (true);

create policy "Admins full access on archived_orders"
  on public.archived_orders
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant all on public.archived_orders to service_role;
grant select, insert, update, delete on public.archived_orders to authenticated;
