-- Stripe test-mode orders (isolated from live orders).

create table public.test_orders (
  id bigint not null default nextval('public.order_id_seq') primary key,
  order_type public.order_type not null,
  status public.order_status not null default 'pending',
  cancel_token text unique,
  tracking_token text unique,

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
  status_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create index test_orders_store_id_idx on public.test_orders (store_id);
create index test_orders_status_idx on public.test_orders (status);
create index test_orders_tracking_token_idx on public.test_orders (tracking_token) where tracking_token is not null;
create index test_orders_order_type_idx on public.test_orders (order_type);
create index test_orders_customer_account_idx
  on public.test_orders (customer_account, created_at desc)
  where customer_account is not null;

comment on table public.test_orders is
  'Customer orders paid via Stripe test mode (isolated from live orders).';

alter table public.test_orders enable row level security;

create policy "Service role full access on test_orders"
  on public.test_orders
  for all
  to service_role
  using (true)
  with check (true);

create policy "Admins full access on test_orders"
  on public.test_orders
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant all on public.test_orders to service_role;
grant select, insert, update, delete on public.test_orders to authenticated;

create policy "Partners read own wholesale test orders"
  on public.test_orders
  for select
  to authenticated
  using (
    customer_account = auth.uid()
    and order_type = 'wholesale'::public.order_type
  );

create policy "Partners read own wholesale test order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.test_orders as o
      where o.id = order_items.order_id
        and o.customer_account = auth.uid()
        and o.order_type = 'wholesale'::public.order_type
    )
  );

create policy "Partners read own wholesale test order payments"
  on public.order_payments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.test_orders as o
      where o.id = order_payments.order_id
        and o.customer_account = auth.uid()
        and o.order_type = 'wholesale'::public.order_type
    )
  );

create policy "Partners read own wholesale test order fulfillments"
  on public.order_fulfillments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.test_orders as o
      where o.id = order_fulfillments.order_id
        and o.customer_account = auth.uid()
        and o.order_type = 'wholesale'::public.order_type
    )
  );

create policy "Public read test orders by tracking token"
  on public.test_orders
  for select
  to anon, authenticated
  using (
    tracking_token is not null
    and tracking_token = public.request_tracking_token()
  );

create policy "Public read test order items by tracking token"
  on public.order_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.test_orders as o
      where o.id = order_items.order_id
        and o.tracking_token is not null
        and o.tracking_token = public.request_tracking_token()
    )
  );

create policy "Public read test order payments by tracking token"
  on public.order_payments
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.test_orders as o
      where o.id = order_payments.order_id
        and o.tracking_token is not null
        and o.tracking_token = public.request_tracking_token()
    )
  );

create policy "Public read test order fulfillments by tracking token"
  on public.order_fulfillments
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.test_orders as o
      where o.id = order_fulfillments.order_id
        and o.tracking_token is not null
        and o.tracking_token = public.request_tracking_token()
    )
  );

grant select on public.test_orders to anon;
