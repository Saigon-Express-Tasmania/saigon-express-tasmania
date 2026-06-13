-- Customer orders (live checkout + in-store fulfillment).

create type public.order_status as enum (
  'pending',
  'awaiting_payment',
  'confirmed',
  'preparing',
  'packed',
  'ready_to_pickup',
  'out_for_delivery',
  'completed',
  'cancelled'
);

create type public.order_fulfillment_type as enum (
  'pick_up',
  'delivery',
  'shipping'
);

create type public.order_type as enum ('delivery', 'pickup', 'catering', 'wholesale');

create type public.order_payment_status as enum ('unpaid', 'paid', 'refunded');

create type public.order_payment_terms as enum (
  'prepaid',
  'due_on_receipt',
  'deposit_required',
  'net_30',
  'net_60',
  'net_90'
);

create type public.order_payment_method as enum (
  'credit_card',
  'debit_card',
  'cash',
  'check',
  'other'
);

create type public.order_payment_gateway as enum (
  'none',
  'stripe',
  'square',
  'paypal',
  'cash',
  'check',
  'other'
);

create type public.order_item_uom as enum ('CASE', 'EACH', 'LBS', 'KG');

-- Shared across orders, draft_orders, and archived_orders.
create sequence public.order_id_seq;

create table public.orders (
  id bigint not null default nextval('public.order_id_seq') primary key,
  is_testing boolean not null default false,
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

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null,
  item_type public.order_type not null,
  menu_item_id bigint references public.menu (id) on delete set null,
  wholesale_item_id bigint references public.wholesale_products (id) on delete set null,
  catering_item_id bigint references public.catering_packs (id) on delete set null,
  sku text not null,
  name text not null,
  quantity numeric(10, 2) not null,
  uom public.order_item_uom not null default 'EACH',
  is_catch_weight boolean not null default false,
  unit_price numeric(10, 2) not null,
  line_total numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create table public.order_payments (
  id bigint generated always as identity primary key,
  order_id bigint not null,
  amount numeric(10, 2) not null,
  status public.order_payment_status not null default 'unpaid',
  mode text check (mode in ('test', 'live')),
  method public.order_payment_method not null,
  gateway public.order_payment_gateway not null default 'none',
  gateway_transaction_id text not null default '',
  gateway_data jsonb,
  recorded_by_staff_id uuid references auth.users (id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.order_fulfillments (
  id bigint generated always as identity primary key,
  order_id bigint not null,
  method public.order_fulfillment_type not null,
  shipping_address jsonb,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  actual_handover timestamptz,
  pickup_person_name text,
  signature_url text,
  temperature_log_c numeric(5, 2),
  released_by_staff uuid references auth.users (id) on delete set null,
  has_exceptions boolean not null default false,
  exception_notes text
);

create index orders_is_testing_idx on public.orders (is_testing);
create index orders_store_id_idx on public.orders (store_id);
create index orders_status_idx on public.orders (status);
create index orders_tracking_token_idx on public.orders (tracking_token) where tracking_token is not null;
create index orders_order_type_idx on public.orders (order_type);
create index orders_customer_account_idx
  on public.orders (customer_account, created_at desc)
  where customer_account is not null;

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_wholesale_item_id_idx on public.order_items (wholesale_item_id)
  where wholesale_item_id is not null;

create index order_payments_order_id_idx on public.order_payments (order_id);
create unique index order_payments_stripe_session_uidx
  on public.order_payments (gateway_transaction_id)
  where gateway = 'stripe'::public.order_payment_gateway
    and gateway_transaction_id <> '';

create index order_fulfillments_order_id_idx on public.order_fulfillments (order_id);

comment on table public.orders is 'Active customer orders placed via checkout or admin.';
comment on table public.order_items is 'Line items shared across all order lifecycle tables.';
comment on table public.order_payments is 'Payment ledger entries shared across all order lifecycle tables.';
comment on table public.order_fulfillments is 'Fulfillment events shared across all order lifecycle tables.';
comment on column public.order_items.order_id is
  'References an order id from orders, draft_orders, or archived_orders (no FK).';

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_payments enable row level security;
alter table public.order_fulfillments enable row level security;

create policy "Service role full access on orders"
  on public.orders
  for all
  to service_role
  using (true)
  with check (true);

create policy "Admins full access on orders"
  on public.orders
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Service role full access on order_items"
  on public.order_items
  for all
  to service_role
  using (true)
  with check (true);

create policy "Admins full access on order_items"
  on public.order_items
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Service role full access on order_payments"
  on public.order_payments
  for all
  to service_role
  using (true)
  with check (true);

create policy "Admins full access on order_payments"
  on public.order_payments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Service role full access on order_fulfillments"
  on public.order_fulfillments
  for all
  to service_role
  using (true)
  with check (true);

create policy "Admins full access on order_fulfillments"
  on public.order_fulfillments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant all on public.orders to service_role;
grant all on public.order_items to service_role;
grant all on public.order_payments to service_role;
grant all on public.order_fulfillments to service_role;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant select, insert, update, delete on public.order_payments to authenticated;
grant select, insert, update, delete on public.order_fulfillments to authenticated;
grant usage, select on sequence public.order_id_seq to service_role, authenticated;

create policy "Partners read own wholesale orders"
  on public.orders
  for select
  to authenticated
  using (
    customer_account = auth.uid()
    and order_type = 'wholesale'::public.order_type
  );

create policy "Partners read own wholesale order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders as o
      where o.id = order_items.order_id
        and o.customer_account = auth.uid()
        and o.order_type = 'wholesale'::public.order_type
    )
  );

create policy "Partners read own wholesale order payments"
  on public.order_payments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders as o
      where o.id = order_payments.order_id
        and o.customer_account = auth.uid()
        and o.order_type = 'wholesale'::public.order_type
    )
  );

create policy "Partners read own wholesale order fulfillments"
  on public.order_fulfillments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders as o
      where o.id = order_fulfillments.order_id
        and o.customer_account = auth.uid()
        and o.order_type = 'wholesale'::public.order_type
    )
  );

create or replace function public.request_tracking_token()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_headers text;
begin
  v_headers := nullif(current_setting('request.headers', true), '');
  if v_headers is null then
    return null;
  end if;

  return nullif(trim((v_headers::json)->>'x-tracking-token'), '');
exception
  when others then
    return null;
end;
$$;

comment on function public.request_tracking_token() is
  'Reads x-tracking-token from PostgREST request headers for order-tracking RLS.';

grant execute on function public.request_tracking_token() to anon, authenticated, service_role;

create policy "Public read orders by tracking token"
  on public.orders
  for select
  to anon, authenticated
  using (
    tracking_token is not null
    and tracking_token = public.request_tracking_token()
  );

create policy "Public read order items by tracking token"
  on public.order_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.orders as o
      where o.id = order_items.order_id
        and o.tracking_token is not null
        and o.tracking_token = public.request_tracking_token()
    )
  );

create policy "Public read order payments by tracking token"
  on public.order_payments
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.orders as o
      where o.id = order_payments.order_id
        and o.tracking_token is not null
        and o.tracking_token = public.request_tracking_token()
    )
  );

create policy "Public read order fulfillments by tracking token"
  on public.order_fulfillments
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.orders as o
      where o.id = order_fulfillments.order_id
        and o.tracking_token is not null
        and o.tracking_token = public.request_tracking_token()
    )
  );

grant select on public.orders to anon;
grant select on public.order_items to anon;
grant select on public.order_payments to anon;
grant select on public.order_fulfillments to anon;
