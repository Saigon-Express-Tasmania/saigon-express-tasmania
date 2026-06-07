-- Archived orders retained for historical/admin-only access.

create table public.archived_orders (
  id bigint generated always as identity primary key,
  original_order_id bigint references public.orders (id) on delete set null,
  customer_account uuid references public.user_profiles (id) on delete set null,
  order_type public.order_type not null,
  customer_name text,
  customer_email text,
  customer_phone text,
  store_id bigint references public.store_locations (id),
  pickup_time text,
  total numeric(10, 2),
  status public.order_status,
  payment_status public.payment_status,
  notes text,
  items jsonb not null default '[]'::jsonb,
  archived_reason text,
  archived_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.archived_orders is
  'Historical order records moved out of active orders.';
comment on column public.archived_orders.items is
  'Snapshot of line items at archive time.';

create or replace function public.archive_and_delete_order(
  p_order_id bigint,
  p_archived_reason text default null
)
returns bigint
language plpgsql
security invoker
as $$
declare
  v_order public.orders%rowtype;
  v_items jsonb;
  v_archived_id bigint;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id;

  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'menuItemId', oi.menu_item_id,
        'qty', oi.qty,
        'unitPrice', oi.unit_price,
        'itemName', oi.item_name
      )
      order by oi.id
    ),
    '[]'::jsonb
  )
  into v_items
  from public.order_items oi
  where oi.order_id = v_order.id;

  insert into public.archived_orders (
    original_order_id,
    customer_name,
    customer_email,
    customer_phone,
    store_id,
    pickup_time,
    total,
    status,
    payment_status,
    notes,
    items,
    archived_reason,
    archived_at,
    created_at,
    updated_at
  )
  values (
    v_order.id,
    v_order.customer_name,
    v_order.customer_email,
    v_order.customer_phone,
    v_order.store_id,
    v_order.pickup_time,
    v_order.total,
    v_order.status,
    v_order.payment_status,
    v_order.notes,
    v_items,
    p_archived_reason,
    now(),
    v_order.created_at,
    now()
  )
  returning id into v_archived_id;

  delete from public.orders where id = v_order.id;

  return v_archived_id;
end;
$$;

alter table public.archived_orders enable row level security;

-- No public access; edge functions use service_role.
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
grant execute on function public.archive_and_delete_order(bigint, text) to authenticated, service_role;
