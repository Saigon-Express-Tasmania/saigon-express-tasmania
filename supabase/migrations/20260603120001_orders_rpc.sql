-- Order lifecycle RPCs used by edge functions (checkout, stripe-webhook) and admin.
--
-- Flow (online checkout):
--   1. checkout creates draft_orders + order_items (shared order_id_seq)
--   2. payment webhook calls create_paid_order_with_items(draft_order_id, items, order_payload, payment_payload)
--   3. create_paid_order_with_items_impl promotes the draft (same id) or inserts a new order,
--      ensures line items exist, records order_payments, and updates wholesale inventory
--
-- Shared child tables (order_items, order_payments, order_fulfillments) reference order_id
-- without FK so rows survive draft -> orders -> archived_orders moves.

create or replace function public.find_order_id_by_gateway_transaction(
  p_gateway public.order_payment_gateway,
  p_gateway_transaction_id text
)
returns bigint
language sql
stable
set search_path = public
as $$
  select op.order_id
  from public.order_payments as op
  where op.gateway = p_gateway
    and op.gateway_transaction_id = p_gateway_transaction_id
  limit 1;
$$;

comment on function public.find_order_id_by_gateway_transaction(public.order_payment_gateway, text) is
  'Idempotency lookup: returns order_id already linked to a gateway transaction id.';

-- Back-compat wrapper for Stripe checkout session ids.
create or replace function public.find_order_id_by_stripe_session(
  p_gateway_transaction_id text
)
returns bigint
language sql
stable
set search_path = public
as $$
  select public.find_order_id_by_gateway_transaction(
    'stripe'::public.order_payment_gateway,
    p_gateway_transaction_id
  );
$$;

comment on function public.find_order_id_by_stripe_session(text) is
  'Stripe shorthand for find_order_id_by_gateway_transaction(''stripe'', session_id).';

-- Inserts line items from a jsonb array whose objects match public.order_items columns
-- (product_id, sku, name, quantity, uom, unit_price, line_total).
-- Skips invalid rows silently; callers must verify at least one row was inserted.
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
    line_total
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
    )
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

comment on function public.insert_order_items_from_payload(bigint, public.order_type, jsonb) is
  'Bulk-inserts order_items for an order from a jsonb array. Each item must include product_id.';

-- Promotes a draft_orders row into public.orders, preserving the shared id and any
-- order_items already linked to that id. Address and B2B fields come from the draft;
-- status, tokens, totals, and customer contact fields are supplied by the caller.
create or replace function public.move_draft_to_paid_order(
  p_draft_id bigint,
  p_status public.order_status,
  p_cancel_token text,
  p_tracking_token text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_requested_fulfillment_method public.order_fulfillment_type,
  p_requested_target_date timestamptz,
  p_subtotal numeric(10, 2),
  p_tax_total numeric(10, 2),
  p_shipping_fee numeric(10, 2),
  p_grand_total numeric(10, 2),
  p_notes text,
  p_status_updated_at timestamptz
)
returns void
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.draft_orders where id = p_draft_id) then
    raise exception 'Draft order % not found', p_draft_id;
  end if;

  insert into public.orders (
    id,
    is_testing,
    order_type,
    status,
    cancel_token,
    tracking_token,
    customer_account,
    customer_name,
    customer_email,
    customer_phone,
    store_id,
    requested_fulfillment_method,
    requested_target_date,
    requested_pick_up_store_id,
    shipping_dba_name,
    shipping_special_instructions,
    shipping_preferred_window,
    shipping_address,
    shipping_city,
    shipping_state,
    shipping_postal_code,
    shipping_country,
    billing_legal_name,
    billing_tax_id,
    billing_address,
    billing_city,
    billing_state,
    billing_postal_code,
    billing_country,
    payment_terms,
    po_number,
    subtotal,
    tax_total,
    shipping_fee,
    grand_total,
    notes,
    status_updated_at,
    created_at
  )
  select
    d.id,
    d.is_testing,
    d.order_type,
    p_status,
    p_cancel_token,
    p_tracking_token,
    d.customer_account,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    d.store_id,
    p_requested_fulfillment_method,
    p_requested_target_date,
    d.requested_pick_up_store_id,
    d.shipping_dba_name,
    d.shipping_special_instructions,
    d.shipping_preferred_window,
    d.shipping_address,
    d.shipping_city,
    d.shipping_state,
    d.shipping_postal_code,
    d.shipping_country,
    d.billing_legal_name,
    d.billing_tax_id,
    d.billing_address,
    d.billing_city,
    d.billing_state,
    d.billing_postal_code,
    d.billing_country,
    d.payment_terms,
    d.po_number,
    p_subtotal,
    p_tax_total,
    p_shipping_fee,
    p_grand_total,
    coalesce(p_notes, d.notes),
    p_status_updated_at,
    d.created_at
  from public.draft_orders as d
  where d.id = p_draft_id;

  delete from public.draft_orders where id = p_draft_id;
end;
$$;

comment on function public.move_draft_to_paid_order(
  bigint,
  public.order_status,
  text,
  text,
  text,
  text,
  text,
  public.order_fulfillment_type,
  timestamptz,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  timestamptz
) is
  'Moves draft_orders -> orders with the same id, then deletes the draft. Child order_items stay attached.';

-- Core paid-order creator.
--   p_draft_order_id   when set, promotes that draft (same id) instead of inserting a new header
--   p_items            jsonb array of order_items-shaped objects (used when not promoting a draft)
--   p_order_payload    jsonb object matching public.orders columns (snake_case)
--   p_payment_payload  jsonb object matching public.order_payments columns; gateway +
--                      gateway_transaction_id enable idempotency and payment insert
create or replace function public.create_paid_order_with_items_impl(
  p_draft_order_id bigint,
  p_items jsonb,
  p_order_payload jsonb,
  p_payment_payload jsonb
)
returns bigint
language plpgsql
set search_path = public
as $$
declare
  v_order_id bigint;
  v_has_items boolean;
  v_is_testing boolean;
  v_order_type public.order_type;
  v_requested_fulfillment_method public.order_fulfillment_type;
  v_customer_account uuid;
  v_customer_name text;
  v_customer_email text;
  v_customer_phone text;
  v_store_id bigint;
  v_requested_pick_up_store_id bigint;
  v_requested_target_date timestamptz;
  v_subtotal numeric(10, 2);
  v_tax_total numeric(10, 2);
  v_shipping_fee numeric(10, 2);
  v_grand_total numeric(10, 2);
  v_notes text;
  v_payment_amount numeric(10, 2);
  v_payment_status public.order_payment_status;
  v_payment_mode text;
  v_payment_method public.order_payment_method;
  v_payment_gateway public.order_payment_gateway;
  v_payment_gateway_transaction_id text;
  v_payment_gateway_data jsonb;
  v_cancel_token text;
  v_tracking_token text;
  v_status_updated_at timestamptz;
  v_items jsonb;
  v_draft_order_id bigint;
  v_shipping_dba_name text;
  v_shipping_special_instructions text;
  v_shipping_preferred_window text;
  v_shipping_address text;
  v_shipping_city text;
  v_shipping_state text;
  v_shipping_postal_code text;
  v_shipping_country text;
  v_billing_legal_name text;
  v_billing_tax_id text;
  v_billing_address text;
  v_billing_city text;
  v_billing_state text;
  v_billing_postal_code text;
  v_billing_country text;
  v_payment_terms public.order_payment_terms;
  v_po_number varchar(100);
begin
  if p_order_payload is null or jsonb_typeof(p_order_payload) <> 'object' then
    raise exception 'order_payload must be a json object';
  end if;

  v_draft_order_id := p_draft_order_id;
  v_items := coalesce(p_items, '[]'::jsonb);

  -- public.orders columns from p_order_payload
  v_is_testing := coalesce((p_order_payload->>'is_testing')::boolean, false);
  v_order_type := (p_order_payload->>'order_type')::public.order_type;
  v_requested_fulfillment_method :=
    nullif(p_order_payload->>'requested_fulfillment_method', '')::public.order_fulfillment_type;
  v_customer_account := nullif(p_order_payload->>'customer_account', '')::uuid;
  v_customer_name := coalesce(p_order_payload->>'customer_name', '');
  v_customer_email := coalesce(p_order_payload->>'customer_email', '');
  v_customer_phone := coalesce(p_order_payload->>'customer_phone', '');
  v_store_id := nullif(p_order_payload->>'store_id', '')::bigint;
  v_requested_pick_up_store_id :=
    nullif(p_order_payload->>'requested_pick_up_store_id', '')::bigint;
  v_requested_target_date := nullif(p_order_payload->>'requested_target_date', '')::timestamptz;
  v_shipping_dba_name := nullif(p_order_payload->>'shipping_dba_name', '');
  v_shipping_special_instructions := nullif(p_order_payload->>'shipping_special_instructions', '');
  v_shipping_preferred_window := nullif(p_order_payload->>'shipping_preferred_window', '');
  v_shipping_address := p_order_payload->>'shipping_address';
  v_shipping_city := p_order_payload->>'shipping_city';
  v_shipping_state := p_order_payload->>'shipping_state';
  v_shipping_postal_code := p_order_payload->>'shipping_postal_code';
  v_shipping_country := p_order_payload->>'shipping_country';
  v_billing_legal_name := nullif(p_order_payload->>'billing_legal_name', '');
  v_billing_tax_id := nullif(p_order_payload->>'billing_tax_id', '');
  v_billing_address := p_order_payload->>'billing_address';
  v_billing_city := p_order_payload->>'billing_city';
  v_billing_state := p_order_payload->>'billing_state';
  v_billing_postal_code := p_order_payload->>'billing_postal_code';
  v_billing_country := p_order_payload->>'billing_country';
  v_payment_terms := coalesce(
    nullif(p_order_payload->>'payment_terms', '')::public.order_payment_terms,
    'prepaid'::public.order_payment_terms
  );
  v_po_number := nullif(p_order_payload->>'po_number', '');
  v_subtotal := nullif(p_order_payload->>'subtotal', '')::numeric(10, 2);
  v_tax_total := coalesce(nullif(p_order_payload->>'tax_total', '')::numeric(10, 2), 0::numeric(10, 2));
  v_shipping_fee := coalesce(nullif(p_order_payload->>'shipping_fee', '')::numeric(10, 2), 0::numeric(10, 2));
  v_grand_total := nullif(p_order_payload->>'grand_total', '')::numeric(10, 2);
  v_notes := nullif(p_order_payload->>'notes', '');
  v_cancel_token := nullif(p_order_payload->>'cancel_token', '');
  v_tracking_token := nullif(p_order_payload->>'tracking_token', '');
  v_status_updated_at := coalesce(
    nullif(p_order_payload->>'status_updated_at', '')::timestamptz,
    now()
  );

  if p_payment_payload is not null and jsonb_typeof(p_payment_payload) = 'object' then
    v_payment_gateway :=
      nullif(p_payment_payload->>'gateway', '')::public.order_payment_gateway;
    v_payment_gateway_transaction_id :=
      nullif(p_payment_payload->>'gateway_transaction_id', '');
    v_payment_amount := nullif(p_payment_payload->>'amount', '')::numeric(10, 2);
    v_payment_status := coalesce(
      nullif(p_payment_payload->>'status', '')::public.order_payment_status,
      'paid'::public.order_payment_status
    );
    v_payment_mode := nullif(p_payment_payload->>'mode', '');
    v_payment_method := coalesce(
      nullif(p_payment_payload->>'method', '')::public.order_payment_method,
      'credit_card'::public.order_payment_method
    );
    v_payment_gateway_data := p_payment_payload->'gateway_data';
  end if;

  if v_order_type is null then
    raise exception 'order_type is required';
  end if;

  if v_requested_fulfillment_method is null then
    raise exception 'requested_fulfillment_method is required';
  end if;

  if v_requested_target_date is null then
    raise exception 'requested_target_date is required';
  end if;

  -- Idempotency: return existing order if this gateway transaction was already processed.
  if v_payment_gateway is not null
    and v_payment_gateway <> 'none'::public.order_payment_gateway
    and v_payment_gateway_transaction_id is not null then
    v_order_id := public.find_order_id_by_gateway_transaction(
      v_payment_gateway,
      v_payment_gateway_transaction_id
    );

    if v_order_id is not null then
      if v_draft_order_id is not null then
        delete from public.draft_orders where id = v_draft_order_id;
      end if;
      perform public.ensure_wholesale_inventory_sales_for_order(v_order_id);
      return v_order_id;
    end if;
  end if;

  if v_grand_total is null or v_grand_total <= 0 then
    raise exception 'Order grand total must be greater than zero';
  end if;

  if v_subtotal is null then
    v_subtotal := greatest(v_grand_total - v_tax_total - v_shipping_fee, 0);
  end if;

  -- Header: promote draft (keeps id + existing items) or insert a new orders row.
  if v_draft_order_id is not null then
    perform public.move_draft_to_paid_order(
      v_draft_order_id,
      'confirmed'::public.order_status,
      v_cancel_token,
      v_tracking_token,
      v_customer_name,
      v_customer_email,
      v_customer_phone,
      v_requested_fulfillment_method,
      v_requested_target_date,
      v_subtotal,
      v_tax_total,
      v_shipping_fee,
      v_grand_total,
      v_notes,
      v_status_updated_at
    );
    v_order_id := v_draft_order_id;
    select o.is_testing
    into v_is_testing
    from public.orders as o
    where o.id = v_order_id;
  else
    if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
      raise exception 'Order items must be a non-empty array';
    end if;

    insert into public.orders (
      is_testing,
      order_type,
      status,
      cancel_token,
      tracking_token,
      customer_account,
      customer_name,
      customer_email,
      customer_phone,
      store_id,
      requested_fulfillment_method,
      requested_target_date,
      requested_pick_up_store_id,
      shipping_dba_name,
      shipping_special_instructions,
      shipping_preferred_window,
      shipping_address,
      shipping_city,
      shipping_state,
      shipping_postal_code,
      shipping_country,
      billing_legal_name,
      billing_tax_id,
      billing_address,
      billing_city,
      billing_state,
      billing_postal_code,
      billing_country,
      payment_terms,
      po_number,
      subtotal,
      tax_total,
      shipping_fee,
      grand_total,
      notes,
      status_updated_at
    )
    values (
      v_is_testing,
      v_order_type,
      'confirmed',
      v_cancel_token,
      v_tracking_token,
      v_customer_account,
      v_customer_name,
      v_customer_email,
      v_customer_phone,
      v_store_id,
      v_requested_fulfillment_method,
      v_requested_target_date,
      v_requested_pick_up_store_id,
      v_shipping_dba_name,
      v_shipping_special_instructions,
      v_shipping_preferred_window,
      v_shipping_address,
      v_shipping_city,
      v_shipping_state,
      v_shipping_postal_code,
      v_shipping_country,
      v_billing_legal_name,
      v_billing_tax_id,
      v_billing_address,
      v_billing_city,
      v_billing_state,
      v_billing_postal_code,
      v_billing_country,
      v_payment_terms,
      v_po_number,
      v_subtotal,
      v_tax_total,
      v_shipping_fee,
      v_grand_total,
      v_notes,
      v_status_updated_at
    )
    returning id
    into v_order_id;
  end if;

  -- Line items: draft checkout already inserted rows; otherwise insert from payload.
  select exists (
    select 1
    from public.order_items
    where order_id = v_order_id
  )
  into v_has_items;

  if not v_has_items then
    if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
      raise exception 'Order items must be a non-empty array';
    end if;

    perform public.insert_order_items_from_payload(v_order_id, v_order_type, v_items);
  end if;

  select exists (
    select 1
    from public.order_items
    where order_id = v_order_id
  )
  into v_has_items;

  if not v_has_items then
    raise exception 'No valid order items found';
  end if;

  -- Payment record when a gateway transaction id is supplied.
  if v_payment_gateway is not null
    and v_payment_gateway <> 'none'::public.order_payment_gateway
    and v_payment_gateway_transaction_id is not null then
    begin
      insert into public.order_payments (
        order_id,
        amount,
        status,
        mode,
        method,
        gateway,
        gateway_transaction_id,
        gateway_data
      )
      values (
        v_order_id,
        coalesce(v_payment_amount, v_grand_total),
        coalesce(v_payment_status, 'paid'::public.order_payment_status),
        v_payment_mode,
        coalesce(v_payment_method, 'credit_card'::public.order_payment_method),
        v_payment_gateway,
        v_payment_gateway_transaction_id,
        v_payment_gateway_data
      );
    exception
      when unique_violation then
        v_order_id := public.find_order_id_by_gateway_transaction(
          v_payment_gateway,
          v_payment_gateway_transaction_id
        );
        if v_order_id is null then
          raise;
        end if;
        perform public.ensure_wholesale_inventory_sales_for_order(v_order_id);
        return v_order_id;
    end;
  end if;

  perform public.ensure_wholesale_inventory_sales_for_order(v_order_id);

  return v_order_id;
end;
$$;

comment on function public.create_paid_order_with_items_impl(
  bigint,
  jsonb,
  jsonb,
  jsonb
) is
  'Internal: atomically creates a confirmed paid order from separate order, item, and payment payloads.';

-- Public entry point for live paid orders. Called by payment webhooks.
create or replace function public.create_paid_order_with_items(
  p_draft_order_id bigint,
  p_items jsonb,
  p_order_payload jsonb,
  p_payment_payload jsonb
)
returns bigint
language plpgsql
set search_path = public
as $$
begin
  return public.create_paid_order_with_items_impl(
    p_draft_order_id,
    p_items,
    p_order_payload,
    p_payment_payload
  );
end;
$$;

-- Back-compat wrapper: forces is_testing = true in order_payload.
create or replace function public.create_paid_test_order_with_items(
  p_draft_order_id bigint,
  p_items jsonb,
  p_order_payload jsonb,
  p_payment_payload jsonb
)
returns bigint
language plpgsql
set search_path = public
as $$
begin
  return public.create_paid_order_with_items_impl(
    p_draft_order_id,
    p_items,
    coalesce(p_order_payload, '{}'::jsonb) || jsonb_build_object('is_testing', true),
    p_payment_payload
  );
end;
$$;

comment on function public.create_paid_order_with_items(bigint, jsonb, jsonb, jsonb) is
  'Creates a confirmed live paid order. Primary payment-webhook entry point.';
comment on function public.create_paid_test_order_with_items(bigint, jsonb, jsonb, jsonb) is
  'Creates a confirmed test paid order by setting is_testing = true on order_payload.';

-- Soft-delete: copies the order header to archived_orders, then removes it from orders.
-- order_items, order_payments, and order_fulfillments are not moved (shared by order_id).
create or replace function public.archive_and_delete_order(
  p_order_id bigint,
  p_archived_reason text default null
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id;

  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  insert into public.archived_orders (
    id,
    is_testing,
    order_type,
    status,
    cancel_token,
    tracking_token,
    customer_account,
    customer_name,
    customer_email,
    customer_phone,
    store_id,
    requested_fulfillment_method,
    requested_target_date,
    requested_pick_up_store_id,
    shipping_dba_name,
    shipping_special_instructions,
    shipping_preferred_window,
    shipping_address,
    shipping_city,
    shipping_state,
    shipping_postal_code,
    shipping_country,
    billing_legal_name,
    billing_tax_id,
    billing_address,
    billing_city,
    billing_state,
    billing_postal_code,
    billing_country,
    payment_terms,
    po_number,
    subtotal,
    tax_total,
    shipping_fee,
    grand_total,
    notes,
    archived_reason,
    archived_at,
    status_updated_at,
    created_at,
    updated_at
  )
  values (
    v_order.id,
    v_order.is_testing,
    v_order.order_type,
    v_order.status,
    v_order.cancel_token,
    v_order.tracking_token,
    v_order.customer_account,
    v_order.customer_name,
    v_order.customer_email,
    v_order.customer_phone,
    v_order.store_id,
    v_order.requested_fulfillment_method,
    v_order.requested_target_date,
    v_order.requested_pick_up_store_id,
    v_order.shipping_dba_name,
    v_order.shipping_special_instructions,
    v_order.shipping_preferred_window,
    v_order.shipping_address,
    v_order.shipping_city,
    v_order.shipping_state,
    v_order.shipping_postal_code,
    v_order.shipping_country,
    v_order.billing_legal_name,
    v_order.billing_tax_id,
    v_order.billing_address,
    v_order.billing_city,
    v_order.billing_state,
    v_order.billing_postal_code,
    v_order.billing_country,
    v_order.payment_terms,
    v_order.po_number,
    v_order.subtotal,
    v_order.tax_total,
    v_order.shipping_fee,
    v_order.grand_total,
    v_order.notes,
    p_archived_reason,
    now(),
    v_order.status_updated_at,
    v_order.created_at,
    now()
  );

  delete from public.orders where id = v_order.id;

  return v_order.id;
end;
$$;

comment on function public.archive_and_delete_order(bigint, text) is
  'Archives an orders row to archived_orders (same id) and deletes the live header. Child rows remain in shared tables for history.';

grant execute on function public.find_order_id_by_gateway_transaction(public.order_payment_gateway, text) to service_role;
grant execute on function public.find_order_id_by_stripe_session(text) to service_role;
grant execute on function public.insert_order_items_from_payload(bigint, public.order_type, jsonb) to service_role;
grant execute on function public.move_draft_to_paid_order(
  bigint,
  public.order_status,
  text,
  text,
  text,
  text,
  text,
  public.order_fulfillment_type,
  timestamptz,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  timestamptz
) to service_role;
grant execute on function public.create_paid_order_with_items_impl(bigint, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.create_paid_order_with_items(bigint, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.create_paid_test_order_with_items(bigint, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.archive_and_delete_order(bigint, text) to authenticated, service_role;
