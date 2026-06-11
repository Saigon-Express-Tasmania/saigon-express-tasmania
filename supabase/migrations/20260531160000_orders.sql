-- Customer pickup orders (Stripe checkout + in-store pickup).

create type public.order_status as enum (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled'
);

create type public.order_type as enum ('delivery', 'pickup', 'catering', 'wholesale');

create type public.payment_status as enum ('unpaid', 'paid', 'refunded');

create table public.orders (
  id bigint generated always as identity primary key,
  order_type public.order_type not null,
  customer_account uuid references public.user_profiles (id) on delete set null,
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
  buyer jsonb,
  shipping_address jsonb,
  billing_address jsonb,
  financial_details jsonb,
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
create unique index orders_stripe_checkout_session_id_uidx
  on public.orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create index order_items_order_id_idx on public.order_items (order_id);
create index orders_order_type_idx on public.orders (order_type);

create or replace function public.create_paid_order_with_items(
  p_order_type public.order_type,
  p_customer_account uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_store_id bigint,
  p_pickup_time text,
  p_total numeric(10, 2),
  p_notes text,
  p_stripe_mode text,
  p_stripe_checkout_session_id text,
  p_cancel_token text,
  p_tracking_token text,
  p_status_updated_at timestamptz,
  p_items jsonb,
  p_draft_order_id bigint default null
)
returns bigint
language plpgsql
as $$
declare
  v_order_id bigint;
begin
  if p_stripe_checkout_session_id is not null then
    select o.id
    into v_order_id
    from public.orders as o
    where o.stripe_checkout_session_id = p_stripe_checkout_session_id
    limit 1;

    if v_order_id is not null then
      if p_draft_order_id is not null then
        delete from public.draft_orders where id = p_draft_order_id;
      end if;
      return v_order_id;
    end if;
  end if;

  if p_total is null or p_total <= 0 then
    raise exception 'Order total must be greater than zero';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order items must be a non-empty array';
  end if;

  begin
    insert into public.orders (
      order_type,
      customer_account,
      customer_name,
      customer_email,
      customer_phone,
      store_id,
      pickup_time,
      total,
      notes,
      payment_status,
      status,
      stripe_mode,
      stripe_checkout_session_id,
      cancel_token,
      tracking_token,
      status_updated_at
    )
    values (
      p_order_type,
      p_customer_account,
      p_customer_name,
      p_customer_email,
      p_customer_phone,
      p_store_id,
      p_pickup_time,
      p_total,
      p_notes,
      'paid',
      'confirmed',
      p_stripe_mode,
      p_stripe_checkout_session_id,
      p_cancel_token,
      p_tracking_token,
      p_status_updated_at
    )
    returning id into v_order_id;
  exception
    when unique_violation then
      select o.id
      into v_order_id
      from public.orders as o
      where o.stripe_checkout_session_id = p_stripe_checkout_session_id
      limit 1;

      if v_order_id is not null then
        if p_draft_order_id is not null then
          delete from public.draft_orders where id = p_draft_order_id;
        end if;
        return v_order_id;
      end if;

      raise;
  end;

  insert into public.order_items (order_id, menu_item_id, qty, unit_price, item_name)
  select
    v_order_id,
    coalesce((item ->> 'menuItemId')::bigint, (item ->> 'productId')::bigint),
    (item ->> 'qty')::integer,
    (item ->> 'unitPrice')::numeric(8, 2),
    item ->> 'itemName'
  from jsonb_array_elements(p_items) as item
  where
    jsonb_typeof(item) = 'object'
    and coalesce((item ->> 'menuItemId')::bigint, (item ->> 'productId')::bigint, 0) > 0
    and coalesce((item ->> 'qty')::integer, 0) >= 1
    and coalesce((item ->> 'unitPrice')::numeric, -1) >= 0
    and nullif(trim(item ->> 'itemName'), '') is not null;

  if not exists (
    select 1 from public.order_items where order_id = v_order_id
  ) then
    raise exception 'No valid order items found';
  end if;

  if p_draft_order_id is not null then
    delete from public.draft_orders where id = p_draft_order_id;
  end if;

  return v_order_id;
end;
$$;

comment on table public.orders is 'Customer pickup orders placed via the public checkout flow.';
comment on column public.orders.stripe_mode is
  'Stripe payment environment used at checkout (test or live).';
comment on table public.order_items is 'Line items for customer pickup orders.';
comment on function public.create_paid_order_with_items is
  'Atomically creates a paid confirmed order and its line items from a draft payload.';

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- No public access; edge functions use service_role.
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

grant all on public.orders to service_role;
grant all on public.order_items to service_role;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant execute on function public.create_paid_order_with_items to service_role;


create index if not exists orders_customer_account_idx
  on public.orders (customer_account, created_at desc)
  where customer_account is not null;

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

