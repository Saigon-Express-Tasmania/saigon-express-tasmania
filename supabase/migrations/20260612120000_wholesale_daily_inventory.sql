-- Wholesale daily inventory: per-product global + per-customer daily caps (Australia/Hobart).
-- Paid sales are recorded in wholesale_inventory_sales; limits enforced at checkout only.

alter table public.wholesale_products
  add column daily_customer_limit integer;

alter table public.wholesale_products
  add constraint wholesale_products_daily_global_limit_check
    check (daily_global_limit >= 0),
  add constraint wholesale_products_daily_customer_limit_check
    check (daily_customer_limit is null or daily_customer_limit >= 0);

comment on column public.wholesale_products.daily_global_limit is
  'Max units sold (paid) per Australia/Hobart calendar day across all customers.';
comment on column public.wholesale_products.daily_customer_limit is
  'Max units one customer may buy per Australia/Hobart calendar day for this product. Null = no per-customer cap.';

-- ---------------------------------------------------------------------------
-- Paid sales ledger
-- ---------------------------------------------------------------------------
create table public.wholesale_inventory_sales (
  id bigint generated always as identity primary key,
  product_id bigint not null
    references public.wholesale_products (id) on delete restrict,
  customer_account uuid not null
    references public.user_profiles (id) on delete restrict,
  order_source text not null
    check (order_source in ('orders', 'test_orders')),
  order_id bigint not null,
  order_item_id bigint not null,
  qty integer not null check (qty > 0),
  sale_date date not null,
  created_at timestamptz not null default now(),
  constraint wholesale_inventory_sales_order_item_unique
    unique (order_source, order_item_id)
);

comment on table public.wholesale_inventory_sales is
  'Append-only ledger of paid wholesale line items; drives daily inventory counts.';

create index wholesale_inventory_sales_product_date_idx
  on public.wholesale_inventory_sales (product_id, sale_date);

create index wholesale_inventory_sales_product_customer_date_idx
  on public.wholesale_inventory_sales (product_id, customer_account, sale_date);

create index wholesale_inventory_sales_order_idx
  on public.wholesale_inventory_sales (order_source, order_id);

alter table public.wholesale_inventory_sales enable row level security;

grant select on public.wholesale_inventory_sales to authenticated;
grant all on public.wholesale_inventory_sales to service_role;

create policy "Service role full access on wholesale_inventory_sales"
  on public.wholesale_inventory_sales
  for all
  to service_role
  using (true)
  with check (true);

create policy "Admins can read wholesale inventory sales"
  on public.wholesale_inventory_sales
  for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.wholesale_business_date(p_at timestamptz default now())
returns date
language sql
stable
set search_path = public
as $$
  select (p_at at time zone 'Australia/Hobart')::date;
$$;

comment on function public.wholesale_business_date(timestamptz) is
  'Calendar date for wholesale daily inventory in Australia/Hobart.';

create or replace view public.wholesale_product_daily_usage
with (security_invoker = true) as
select
  s.product_id,
  s.sale_date,
  sum(s.qty)::bigint as global_paid_qty
from public.wholesale_inventory_sales as s
group by s.product_id, s.sale_date;

comment on view public.wholesale_product_daily_usage is
  'Paid wholesale units sold per product per Hobart calendar day.';

grant select on public.wholesale_product_daily_usage to authenticated, service_role;

create or replace function public.get_wholesale_product_availability(
  p_product_id bigint,
  p_customer_account uuid default null,
  p_sale_date date default public.wholesale_business_date()
)
returns table (
  product_id bigint,
  daily_global_limit integer,
  global_paid_qty bigint,
  global_remaining integer,
  daily_customer_limit integer,
  customer_paid_qty bigint,
  customer_remaining integer,
  effective_remaining integer
)
language sql
stable
security definer
set search_path = public
as $$
  with product_limits as (
    select
      wp.id,
      wp.daily_global_limit,
      wp.daily_customer_limit
    from public.wholesale_products as wp
    where wp.id = p_product_id
  ),
  global_usage as (
    select coalesce(sum(s.qty), 0)::bigint as paid_qty
    from public.wholesale_inventory_sales as s
    where s.product_id = p_product_id
      and s.sale_date = p_sale_date
  ),
  customer_usage as (
    select coalesce(sum(s.qty), 0)::bigint as paid_qty
    from public.wholesale_inventory_sales as s
    where s.product_id = p_product_id
      and s.sale_date = p_sale_date
      and p_customer_account is not null
      and s.customer_account = p_customer_account
  )
  select
    pl.id as product_id,
    pl.daily_global_limit,
    gu.paid_qty as global_paid_qty,
    greatest(pl.daily_global_limit - gu.paid_qty::integer, 0) as global_remaining,
    pl.daily_customer_limit,
    case
      when p_customer_account is null then 0::bigint
      else cu.paid_qty
    end as customer_paid_qty,
    case
      when pl.daily_customer_limit is null then null::integer
      else greatest(
        pl.daily_customer_limit - case
          when p_customer_account is null then 0
          else cu.paid_qty::integer
        end,
        0
      )
    end as customer_remaining,
    case
      when pl.daily_customer_limit is null then greatest(pl.daily_global_limit - gu.paid_qty::integer, 0)
      else least(
        greatest(pl.daily_global_limit - gu.paid_qty::integer, 0),
        greatest(
          pl.daily_customer_limit - case
            when p_customer_account is null then 0
            else cu.paid_qty::integer
          end,
          0
        )
      )
    end as effective_remaining
  from product_limits as pl
  cross join global_usage as gu
  cross join customer_usage as cu;
$$;

comment on function public.get_wholesale_product_availability(bigint, uuid, date) is
  'Remaining wholesale units available today for a product (paid sales only, Hobart day).';

create or replace function public.get_wholesale_products_availability(
  p_customer_account uuid default null,
  p_sale_date date default public.wholesale_business_date()
)
returns table (
  product_id bigint,
  daily_global_limit integer,
  global_paid_qty bigint,
  global_remaining integer,
  daily_customer_limit integer,
  customer_paid_qty bigint,
  customer_remaining integer,
  effective_remaining integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.product_id,
    a.daily_global_limit,
    a.global_paid_qty,
    a.global_remaining,
    a.daily_customer_limit,
    a.customer_paid_qty,
    a.customer_remaining,
    a.effective_remaining
  from public.wholesale_products as wp
  cross join lateral public.get_wholesale_product_availability(
    wp.id,
    p_customer_account,
    p_sale_date
  ) as a
  where wp.is_available = true;
$$;

comment on function public.get_wholesale_products_availability(uuid, date) is
  'Bulk availability for all active wholesale products.';

create or replace function public.record_wholesale_inventory_sales(
  p_order_source text,
  p_order_id bigint,
  p_customer_account uuid,
  p_sale_date date default public.wholesale_business_date()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_order_source not in ('orders', 'test_orders') then
    raise exception 'invalid order source';
  end if;

  if p_customer_account is null then
    raise exception 'customer account is required for wholesale inventory';
  end if;

  if p_order_source = 'orders' then
    insert into public.wholesale_inventory_sales (
      product_id,
      customer_account,
      order_source,
      order_id,
      order_item_id,
      qty,
      sale_date
    )
    select
      oi.menu_item_id,
      p_customer_account,
      'orders',
      o.id,
      oi.id,
      oi.qty,
      p_sale_date
    from public.order_items as oi
    inner join public.orders as o on o.id = oi.order_id
    where o.id = p_order_id
      and o.order_type = 'wholesale'::public.order_type
    on conflict (order_source, order_item_id) do nothing;
  else
    insert into public.wholesale_inventory_sales (
      product_id,
      customer_account,
      order_source,
      order_id,
      order_item_id,
      qty,
      sale_date
    )
    select
      oi.menu_item_id,
      p_customer_account,
      'test_orders',
      o.id,
      oi.id,
      oi.qty,
      p_sale_date
    from public.test_order_items as oi
    inner join public.test_orders as o on o.id = oi.order_id
    where o.id = p_order_id
      and o.order_type = 'wholesale'::public.order_type
    on conflict (order_source, order_item_id) do nothing;
  end if;
end;
$$;

comment on function public.record_wholesale_inventory_sales(text, bigint, uuid, date) is
  'Records paid wholesale line items into the daily inventory ledger (idempotent).';

grant execute on function public.wholesale_business_date(timestamptz) to anon, authenticated, service_role;
grant execute on function public.get_wholesale_product_availability(bigint, uuid, date) to anon, authenticated, service_role;
grant execute on function public.get_wholesale_products_availability(uuid, date) to anon, authenticated, service_role;
grant execute on function public.record_wholesale_inventory_sales(text, bigint, uuid, date) to service_role;

-- ---------------------------------------------------------------------------
-- Paid order RPCs: record wholesale inventory after line items are inserted
-- ---------------------------------------------------------------------------
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

  if p_order_type = 'wholesale'::public.order_type then
    perform public.record_wholesale_inventory_sales(
      'orders',
      v_order_id,
      p_customer_account
    );
  end if;

  if p_draft_order_id is not null then
    delete from public.draft_orders where id = p_draft_order_id;
  end if;

  return v_order_id;
end;
$$;

create or replace function public.create_paid_test_order_with_items(
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
    from public.test_orders as o
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
    insert into public.test_orders (
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
      from public.test_orders as o
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

  insert into public.test_order_items (order_id, menu_item_id, qty, unit_price, item_name)
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
    select 1 from public.test_order_items where order_id = v_order_id
  ) then
    raise exception 'No valid order items found';
  end if;

  if p_order_type = 'wholesale'::public.order_type then
    perform public.record_wholesale_inventory_sales(
      'test_orders',
      v_order_id,
      p_customer_account
    );
  end if;

  if p_draft_order_id is not null then
    delete from public.draft_orders where id = p_draft_order_id;
  end if;

  return v_order_id;
end;
$$;
