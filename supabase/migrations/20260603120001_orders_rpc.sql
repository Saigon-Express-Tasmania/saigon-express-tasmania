create or replace function public.find_order_id_by_stripe_session(
  p_gateway_transaction_id text
)
returns bigint
language sql
stable
set search_path = public
as $$
  select op.order_id
  from public.order_payments as op
  where op.gateway = 'stripe'::public.order_payment_gateway
    and op.gateway_transaction_id = p_gateway_transaction_id
  limit 1;
$$;

comment on function public.find_order_id_by_stripe_session(text) is
  'Returns the shared order id for a Stripe checkout session (idempotent webhook helper).';

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
    menu_item_id,
    wholesale_item_id,
    catering_item_id,
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
    case
      when p_order_type = 'wholesale'::public.order_type then null
      else coalesce((item ->> 'menuItemId')::bigint, (item ->> 'productId')::bigint)
    end,
    case
      when p_order_type = 'wholesale'::public.order_type
        then coalesce((item ->> 'wholesaleItemId')::bigint, (item ->> 'menuItemId')::bigint, (item ->> 'productId')::bigint)
      else null
    end,
    case
      when p_order_type = 'catering'::public.order_type
        then coalesce((item ->> 'cateringItemId')::bigint, (item ->> 'menuItemId')::bigint)
      else null
    end,
    coalesce(nullif(trim(item ->> 'sku'), ''), nullif(trim(item ->> 'itemName'), ''), 'UNKNOWN'),
    coalesce(item ->> 'name', item ->> 'itemName'),
    coalesce((item ->> 'quantity')::numeric(10, 2), (item ->> 'qty')::numeric(10, 2)),
    coalesce(nullif(item ->> 'uom', ''), 'EACH')::public.order_item_uom,
    coalesce((item ->> 'isCatchWeight')::boolean, false),
    (item ->> 'unitPrice')::numeric(10, 2),
    coalesce(
      (item ->> 'lineTotal')::numeric(10, 2),
      coalesce((item ->> 'quantity')::numeric(10, 2), (item ->> 'qty')::numeric(10, 2))
        * (item ->> 'unitPrice')::numeric(10, 2)
    )
  from jsonb_array_elements(p_items) as item
  where
    jsonb_typeof(item) = 'object'
    and coalesce(
      (item ->> 'menuItemId')::bigint,
      (item ->> 'productId')::bigint,
      (item ->> 'wholesaleItemId')::bigint,
      (item ->> 'cateringItemId')::bigint,
      0
    ) > 0
    and coalesce((item ->> 'quantity')::numeric(10, 2), (item ->> 'qty')::numeric(10, 2), 0) > 0
    and coalesce((item ->> 'unitPrice')::numeric, -1) >= 0
    and nullif(trim(coalesce(item ->> 'name', item ->> 'itemName')), '') is not null;
end;
$$;

create or replace function public.move_draft_to_paid_order(
  p_draft_id bigint,
  p_target_table text,
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
  if p_target_table not in ('orders', 'test_orders') then
    raise exception 'Invalid paid order target table';
  end if;

  if not exists (select 1 from public.draft_orders where id = p_draft_id) then
    raise exception 'Draft order % not found', p_draft_id;
  end if;

  execute format($sql$
    insert into public.%I (
      id,
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
      shipping_address,
      shipping_city,
      shipping_state,
      shipping_postal_code,
      shipping_country,
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
      financial_details,
      notes,
      status_updated_at,
      created_at
    )
    select
      d.id,
      d.order_type,
      $1,
      $2,
      $3,
      d.customer_account,
      $4,
      $5,
      $6,
      d.store_id,
      $7,
      $8,
      d.shipping_address,
      d.shipping_city,
      d.shipping_state,
      d.shipping_postal_code,
      d.shipping_country,
      d.billing_address,
      d.billing_city,
      d.billing_state,
      d.billing_postal_code,
      d.billing_country,
      d.payment_terms,
      d.po_number,
      $9,
      $10,
      $11,
      $12,
      d.financial_details,
      coalesce($13, d.notes),
      $14,
      d.created_at
    from public.draft_orders as d
    where d.id = $15
  $sql$, p_target_table)
  using
    p_status,
    p_cancel_token,
    p_tracking_token,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_requested_fulfillment_method,
    p_requested_target_date,
    p_subtotal,
    p_tax_total,
    p_shipping_fee,
    p_grand_total,
    p_notes,
    p_status_updated_at,
    p_draft_id;

  delete from public.draft_orders where id = p_draft_id;
end;
$$;

create or replace function public.create_paid_order_with_items_impl(
  p_orders_table text,
  p_payload jsonb
)
returns bigint
language plpgsql
set search_path = public
as $$
declare
  v_order_id bigint;
  v_has_items boolean;
  v_order_type public.order_type;
  v_requested_fulfillment_method public.order_fulfillment_type;
  v_customer_account uuid;
  v_customer_name text;
  v_customer_email text;
  v_customer_phone text;
  v_store_id bigint;
  v_requested_target_date timestamptz;
  v_subtotal numeric(10, 2);
  v_tax_total numeric(10, 2);
  v_shipping_fee numeric(10, 2);
  v_grand_total numeric(10, 2);
  v_notes text;
  v_stripe_mode text;
  v_stripe_checkout_session_id text;
  v_cancel_token text;
  v_tracking_token text;
  v_status_updated_at timestamptz;
  v_items jsonb;
  v_draft_order_id bigint;
  v_shipping_address text;
  v_shipping_city text;
  v_shipping_state text;
  v_shipping_postal_code text;
  v_shipping_country text;
  v_billing_address text;
  v_billing_city text;
  v_billing_state text;
  v_billing_postal_code text;
  v_billing_country text;
  v_financial_details jsonb;
  v_payment_terms public.order_payment_terms;
  v_po_number varchar(100);
  v_legacy_pickup_time text;
  v_legacy_total numeric(10, 2);
begin
  if p_orders_table not in ('orders', 'test_orders') then
    raise exception 'Invalid paid order target table';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Order payload must be a json object';
  end if;

  v_order_type := (p_payload->>'order_type')::public.order_type;
  v_requested_fulfillment_method := coalesce(
    nullif(p_payload->>'requested_fulfillment_method', '')::public.order_fulfillment_type,
    nullif(p_payload->>'fulfillment_type', '')::public.order_fulfillment_type,
    'pick_up'::public.order_fulfillment_type
  );
  v_customer_account := nullif(p_payload->>'customer_account', '')::uuid;
  v_customer_name := coalesce(p_payload->>'customer_name', '');
  v_customer_email := coalesce(p_payload->>'customer_email', '');
  v_customer_phone := coalesce(p_payload->>'customer_phone', '');
  v_store_id := nullif(p_payload->>'store_id', '')::bigint;
  v_legacy_pickup_time := coalesce(p_payload->>'pickup_time', '');
  v_requested_target_date := coalesce(
    nullif(p_payload->>'requested_target_date', '')::timestamptz,
    nullif(v_legacy_pickup_time, '')::timestamptz,
    now() + interval '1 day'
  );
  v_legacy_total := nullif(p_payload->>'total', '')::numeric(10, 2);
  v_subtotal := coalesce(
    nullif(p_payload->>'subtotal', '')::numeric(10, 2),
    nullif(p_payload->'financial_details'->>'subtotal_ex_gst', '')::numeric(10, 2),
    v_legacy_total
  );
  v_tax_total := coalesce(
    nullif(p_payload->>'tax_total', '')::numeric(10, 2),
    nullif(p_payload->'financial_details'->>'gst_total', '')::numeric(10, 2),
    0::numeric(10, 2)
  );
  v_shipping_fee := coalesce(nullif(p_payload->>'shipping_fee', '')::numeric(10, 2), 0::numeric(10, 2));
  v_grand_total := coalesce(
    nullif(p_payload->>'grand_total', '')::numeric(10, 2),
    nullif(p_payload->'financial_details'->>'grand_total_inc_gst', '')::numeric(10, 2),
    v_legacy_total
  );
  v_notes := nullif(p_payload->>'notes', '');
  v_stripe_mode := nullif(p_payload->>'stripe_mode', '');
  v_stripe_checkout_session_id := nullif(p_payload->>'stripe_checkout_session_id', '');
  v_cancel_token := nullif(p_payload->>'cancel_token', '');
  v_tracking_token := nullif(p_payload->>'tracking_token', '');
  v_status_updated_at := coalesce(
    nullif(p_payload->>'status_updated_at', '')::timestamptz,
    now()
  );
  v_items := coalesce(p_payload->'items', '[]'::jsonb);
  v_draft_order_id := nullif(p_payload->>'draft_order_id', '')::bigint;
  v_financial_details := p_payload->'financial_details';

  if jsonb_typeof(p_payload->'shipping_address') = 'object' then
    v_shipping_address := coalesce(
      nullif(trim(concat_ws(', ',
        nullif(p_payload->'shipping_address'->>'street_1', ''),
        nullif(p_payload->'shipping_address'->>'street_2', '')
      )), ''),
      'N/A'
    );
    v_shipping_city := coalesce(nullif(trim(p_payload->'shipping_address'->>'city'), ''), 'N/A');
    v_shipping_state := coalesce(nullif(trim(p_payload->'shipping_address'->>'state'), ''), 'N/A');
    v_shipping_postal_code := coalesce(nullif(trim(p_payload->'shipping_address'->>'postal_code'), ''), '0000');
    v_shipping_country := coalesce(nullif(trim(p_payload->'shipping_address'->>'country'), ''), 'Australia');
  else
    v_shipping_address := coalesce(nullif(trim(p_payload->>'shipping_address'), ''), 'N/A');
    v_shipping_city := coalesce(nullif(trim(p_payload->>'shipping_city'), ''), 'N/A');
    v_shipping_state := coalesce(nullif(trim(p_payload->>'shipping_state'), ''), 'N/A');
    v_shipping_postal_code := coalesce(nullif(trim(p_payload->>'shipping_postal_code'), ''), '0000');
    v_shipping_country := coalesce(nullif(trim(p_payload->>'shipping_country'), ''), 'Australia');
  end if;

  if jsonb_typeof(p_payload->'billing_address') = 'object' then
    v_billing_address := coalesce(
      nullif(trim(concat_ws(', ',
        nullif(p_payload->'billing_address'->>'street_1', ''),
        nullif(p_payload->'billing_address'->>'street_2', '')
      )), ''),
      'N/A'
    );
    v_billing_city := coalesce(nullif(trim(p_payload->'billing_address'->>'city'), ''), 'N/A');
    v_billing_state := coalesce(nullif(trim(p_payload->'billing_address'->>'state'), ''), 'N/A');
    v_billing_postal_code := coalesce(nullif(trim(p_payload->'billing_address'->>'postal_code'), ''), '0000');
    v_billing_country := coalesce(nullif(trim(p_payload->'billing_address'->>'country'), ''), 'Australia');
  else
    v_billing_address := coalesce(nullif(trim(p_payload->>'billing_address'), ''), 'N/A');
    v_billing_city := coalesce(nullif(trim(p_payload->>'billing_city'), ''), 'N/A');
    v_billing_state := coalesce(nullif(trim(p_payload->>'billing_state'), ''), 'N/A');
    v_billing_postal_code := coalesce(nullif(trim(p_payload->>'billing_postal_code'), ''), '0000');
    v_billing_country := coalesce(nullif(trim(p_payload->>'billing_country'), ''), 'Australia');
  end if;
  v_payment_terms := coalesce(
    nullif(p_payload->>'payment_terms', '')::public.order_payment_terms,
    'prepaid'::public.order_payment_terms
  );
  v_po_number := nullif(p_payload->>'po_number', '');

  if v_stripe_checkout_session_id is not null then
    v_order_id := public.find_order_id_by_stripe_session(v_stripe_checkout_session_id);

    if v_order_id is not null then
      if v_draft_order_id is not null then
        delete from public.draft_orders where id = v_draft_order_id;
      end if;
      return v_order_id;
    end if;
  end if;

  if v_grand_total is null or v_grand_total <= 0 then
    raise exception 'Order grand total must be greater than zero';
  end if;

  if v_subtotal is null then
    v_subtotal := greatest(v_grand_total - v_tax_total - v_shipping_fee, 0);
  end if;

  if v_draft_order_id is not null then
    perform public.move_draft_to_paid_order(
      v_draft_order_id,
      p_orders_table,
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
  else
    if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
      raise exception 'Order items must be a non-empty array';
    end if;

    execute format($sql$
      insert into public.%I (
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
        shipping_address,
        shipping_city,
        shipping_state,
        shipping_postal_code,
        shipping_country,
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
        financial_details,
        notes,
        status_updated_at
      )
      values (
        $1, 'confirmed', $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26, $27, $28, $29
      )
      returning id
    $sql$, p_orders_table)
    into v_order_id
    using
      v_order_type,
      v_cancel_token,
      v_tracking_token,
      v_customer_account,
      v_customer_name,
      v_customer_email,
      v_customer_phone,
      v_store_id,
      v_requested_fulfillment_method,
      v_requested_target_date,
      v_shipping_address,
      v_shipping_city,
      v_shipping_state,
      v_shipping_postal_code,
      v_shipping_country,
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
      v_financial_details,
      v_notes,
      v_status_updated_at;
  end if;

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

  if v_stripe_checkout_session_id is not null then
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
        v_grand_total,
        'paid'::public.order_payment_status,
        v_stripe_mode,
        'credit_card'::public.order_payment_method,
        'stripe'::public.order_payment_gateway,
        v_stripe_checkout_session_id,
        jsonb_build_object('stripe_checkout_session_id', v_stripe_checkout_session_id)
      );
    exception
      when unique_violation then
        v_order_id := public.find_order_id_by_stripe_session(v_stripe_checkout_session_id);
        if v_order_id is null then
          raise;
        end if;
        return v_order_id;
    end;
  end if;

  if v_order_type = 'wholesale'::public.order_type then
    perform public.record_wholesale_inventory_sales(
      p_orders_table,
      v_order_id,
      v_customer_account
    );
  end if;

  return v_order_id;
end;
$$;

comment on function public.create_paid_order_with_items_impl is
  'Internal helper: promotes a draft or creates a paid order while preserving shared child rows.';

create or replace function public.create_paid_order_with_items(p_payload jsonb)
returns bigint
language plpgsql
set search_path = public
as $$
begin
  return public.create_paid_order_with_items_impl('orders', p_payload);
end;
$$;

create or replace function public.create_paid_test_order_with_items(p_payload jsonb)
returns bigint
language plpgsql
set search_path = public
as $$
begin
  return public.create_paid_order_with_items_impl('test_orders', p_payload);
end;
$$;

comment on function public.create_paid_order_with_items(jsonb) is
  'Atomically creates a paid confirmed live order from a jsonb payload.';
comment on function public.create_paid_test_order_with_items(jsonb) is
  'Atomically creates a paid confirmed test order from a jsonb payload.';

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
    shipping_address,
    shipping_city,
    shipping_state,
    shipping_postal_code,
    shipping_country,
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
    financial_details,
    notes,
    archived_reason,
    archived_at,
    status_updated_at,
    created_at,
    updated_at
  )
  values (
    v_order.id,
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
    v_order.shipping_address,
    v_order.shipping_city,
    v_order.shipping_state,
    v_order.shipping_postal_code,
    v_order.shipping_country,
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
    v_order.financial_details,
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
  'Moves an active order to archived_orders by id; child rows stay in shared tables.';

grant execute on function public.find_order_id_by_stripe_session(text) to service_role;
grant execute on function public.insert_order_items_from_payload(bigint, public.order_type, jsonb) to service_role;
grant execute on function public.move_draft_to_paid_order(
  bigint,
  text,
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
grant execute on function public.create_paid_order_with_items_impl(text, jsonb) to service_role;
grant execute on function public.create_paid_order_with_items(jsonb) to service_role;
grant execute on function public.create_paid_test_order_with_items(jsonb) to service_role;
grant execute on function public.archive_and_delete_order(bigint, text) to authenticated, service_role;
