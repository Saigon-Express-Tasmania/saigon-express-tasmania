-- Persist per-line customisation selections on order items (menu + catering).

alter table public.order_items
  add column if not exists customisation jsonb;

comment on column public.order_items.customisation is
  'Customer customisation payload: selections, note, extraPrice, qty.';

create or replace function public.insert_order_items_from_payload(
  p_order_id bigint,
  p_order_type public.order_type,
  p_items jsonb
)
returns void
language plpgsql
set search_path = public
as $$
begin
  insert into public.order_items (
    order_id,
    item_type,
    product_id,
    sku,
    name,
    quantity,
    uom,
    is_catch_weight,
    unit_price,
    line_total,
    customisation
  )
  select
    p_order_id,
    p_order_type,
    v.product_id,
    coalesce(nullif(trim(item ->> 'sku'), ''), 'UNKNOWN'),
    item ->> 'name',
    (item ->> 'quantity')::numeric(10, 2),
    coalesce(nullif(item ->> 'uom', ''), 'EACH')::public.product_uom,
    coalesce((item ->> 'is_catch_weight')::boolean, false),
    (item ->> 'unit_price')::numeric(10, 2),
    coalesce(
      (item ->> 'line_total')::numeric(10, 2),
      (item ->> 'quantity')::numeric(10, 2) * (item ->> 'unit_price')::numeric(10, 2)
    ),
    case
      when item ? 'customisation' and jsonb_typeof(item -> 'customisation') = 'object'
        then item -> 'customisation'
      else null
    end
  from jsonb_array_elements(p_items) as item
  cross join lateral (
    select nullif(item ->> 'product_id', '')::bigint as product_id
  ) as v
  where
    jsonb_typeof(item) = 'object'
    and v.product_id is not null
    and v.product_id > 0
    and coalesce((item ->> 'quantity')::numeric(10, 2), 0) > 0
    and coalesce((item ->> 'unit_price')::numeric, -1) >= 0
    and nullif(trim(item ->> 'name'), '') is not null;
end;
$$;
