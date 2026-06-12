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
  product_id bigint
    references public.wholesale_products (id) on delete set null,
  customer_account uuid
    references public.user_profiles (id) on delete set null,
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

  execute format($sql$
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
      coalesce(oi.wholesale_item_id, oi.menu_item_id),
      $2,
      $3,
      o.id,
      oi.id,
      trunc(oi.quantity)::integer,
      $4
    from public.order_items as oi
    inner join public.%I as o on o.id = oi.order_id
    where o.id = $1
      and o.order_type = 'wholesale'::public.order_type
    on conflict (order_source, order_item_id) do nothing
  $sql$, p_order_source)
  using p_order_id, p_customer_account, p_order_source, p_sale_date;
end;
$$;

comment on function public.record_wholesale_inventory_sales(text, bigint, uuid, date) is
  'Records paid wholesale line items into the daily inventory ledger (idempotent).';

grant execute on function public.wholesale_business_date(timestamptz) to anon, authenticated, service_role;
grant execute on function public.get_wholesale_product_availability(bigint, uuid, date) to anon, authenticated, service_role;
grant execute on function public.get_wholesale_products_availability(uuid, date) to anon, authenticated, service_role;
grant execute on function public.record_wholesale_inventory_sales(text, bigint, uuid, date) to service_role;

-- Paid order RPCs are defined in 20260531160000_orders.sql and call
-- record_wholesale_inventory_sales after line items are inserted.
