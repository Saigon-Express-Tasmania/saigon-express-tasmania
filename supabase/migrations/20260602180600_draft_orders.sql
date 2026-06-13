-- Pre-checkout draft orders used to save unpaid carts.

create table public.draft_orders (
  id bigint not null default nextval('public.order_id_seq') primary key,
  is_testing boolean not null default false,
  order_type public.order_type not null,
  status public.order_status not null default 'awaiting_payment',
  invoice_number text,
  cancel_token text unique,
  tracking_token text unique,

  customer_account uuid references public.user_profiles (id) on delete set null,
  customer_name text,
  customer_email text,
  customer_phone text,

  store_id bigint references public.store_locations (id) on delete set null,
  requested_fulfillment_method public.order_fulfillment_type not null default 'pick_up',
  requested_target_date timestamptz,
  requested_pick_up_store_id bigint references public.store_locations (id) on delete set null,

  shipping_dba_name text,
  shipping_special_instructions text,
  shipping_preferred_window text,
  shipping_address text not null,
  shipping_city text not null,
  shipping_state text not null,
  shipping_postal_code text not null,
  shipping_country text not null,
  
  billing_legal_name text,
  billing_tax_id text,
  billing_address text not null,
  billing_city text not null,
  billing_state text not null,
  billing_postal_code text not null,
  billing_country text not null,

  payment_terms public.order_payment_terms not null default 'prepaid',
  po_number varchar(100),
  subtotal numeric(10, 2),
  tax_total numeric(10, 2) default 0.00,
  shipping_fee numeric(10, 2) default 0.00,
  grand_total numeric(10, 2),
  
  notes text,
  expires_at timestamptz,
  status_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index draft_orders_is_testing_idx on public.draft_orders (is_testing);
create index draft_orders_store_id_idx on public.draft_orders (store_id);
create index draft_orders_expires_at_idx on public.draft_orders (expires_at);
create index draft_orders_customer_email_idx on public.draft_orders (customer_email) where customer_email is not null;
create index draft_orders_order_type_idx on public.draft_orders (order_type);
create index draft_orders_customer_account_idx
  on public.draft_orders (customer_account, created_at desc)
  where customer_account is not null;

comment on table public.draft_orders is
  'Temporary unpaid orders saved before checkout is completed.';
comment on column public.draft_orders.id is
  'Shared order id sequence; line items live in public.order_items with the same order_id.';

alter table public.draft_orders enable row level security;

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
