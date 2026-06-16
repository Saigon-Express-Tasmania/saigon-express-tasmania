-- Place catering orders directly in public.orders (no draft_orders / payment).
-- Status is pending until admin provides a quotation and moves the order to payment.

create or replace function public.create_pending_catering_order(
  p_order_payload jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id bigint;
  v_order_type public.order_type;
  v_has_items boolean;
  v_is_testing boolean;
  v_requested_fulfillment_method public.order_fulfillment_type;
  v_customer_account uuid;
  v_customer_name text;
  v_customer_email text;
  v_customer_phone text;
  v_requested_target_date timestamptz;
  v_cancel_token text;
  v_tracking_token text;
  v_status_updated_at timestamptz;
  v_subtotal numeric(10, 2);
  v_coupon_code text;
  v_coupon_discount numeric(10, 2);
  v_wholesale_discount numeric(10, 2);
  v_tax_total numeric(10, 2);
  v_shipping_fee numeric(10, 2);
  v_grand_total numeric(10, 2);
  v_notes text;
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
  v_invoice_number text;
begin
  if p_order_payload is null or jsonb_typeof(p_order_payload) <> 'object' then
    raise exception 'order_payload must be a json object';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order items must be a non-empty array';
  end if;

  v_order_type := (p_order_payload->>'order_type')::public.order_type;
  if v_order_type is distinct from 'catering'::public.order_type then
    raise exception 'Only catering orders can be created with this function';
  end if;

  v_is_testing := coalesce((p_order_payload->>'is_testing')::boolean, false);
  v_requested_fulfillment_method :=
    nullif(p_order_payload->>'requested_fulfillment_method', '')::public.order_fulfillment_type;
  v_customer_account := nullif(p_order_payload->>'customer_account', '')::uuid;
  v_customer_name := coalesce(nullif(trim(p_order_payload->>'customer_name'), ''), '');
  v_customer_email := coalesce(nullif(trim(p_order_payload->>'customer_email'), ''), '');
  v_customer_phone := coalesce(nullif(trim(p_order_payload->>'customer_phone'), ''), '');
  v_requested_target_date := nullif(p_order_payload->>'requested_target_date', '')::timestamptz;
  v_cancel_token := nullif(trim(p_order_payload->>'cancel_token'), '');
  v_tracking_token := nullif(trim(p_order_payload->>'tracking_token'), '');
  v_status_updated_at := coalesce(
    nullif(p_order_payload->>'status_updated_at', '')::timestamptz,
    now()
  );
  v_shipping_dba_name := nullif(trim(p_order_payload->>'shipping_dba_name'), '');
  v_shipping_special_instructions := nullif(trim(p_order_payload->>'shipping_special_instructions'), '');
  v_shipping_preferred_window := nullif(trim(p_order_payload->>'shipping_preferred_window'), '');
  v_shipping_address := coalesce(nullif(trim(p_order_payload->>'shipping_address'), ''), '');
  v_shipping_city := coalesce(nullif(trim(p_order_payload->>'shipping_city'), ''), '');
  v_shipping_state := coalesce(nullif(trim(p_order_payload->>'shipping_state'), ''), 'N/A');
  v_shipping_postal_code := coalesce(nullif(trim(p_order_payload->>'shipping_postal_code'), ''), '');
  v_shipping_country := coalesce(nullif(trim(p_order_payload->>'shipping_country'), ''), 'Australia');
  v_billing_legal_name := coalesce(
    nullif(trim(p_order_payload->>'billing_legal_name'), ''),
    v_shipping_dba_name,
    v_customer_name
  );
  v_billing_tax_id := nullif(trim(p_order_payload->>'billing_tax_id'), '');
  v_billing_address := coalesce(
    nullif(trim(p_order_payload->>'billing_address'), ''),
    v_shipping_address
  );
  v_billing_city := coalesce(nullif(trim(p_order_payload->>'billing_city'), ''), v_shipping_city);
  v_billing_state := coalesce(nullif(trim(p_order_payload->>'billing_state'), ''), v_shipping_state);
  v_billing_postal_code := coalesce(
    nullif(trim(p_order_payload->>'billing_postal_code'), ''),
    v_shipping_postal_code
  );
  v_billing_country := coalesce(
    nullif(trim(p_order_payload->>'billing_country'), ''),
    v_shipping_country
  );
  v_payment_terms := coalesce(
    nullif(p_order_payload->>'payment_terms', '')::public.order_payment_terms,
    'prepaid'::public.order_payment_terms
  );
  v_subtotal := nullif(p_order_payload->>'subtotal', '')::numeric(10, 2);
  v_coupon_code := nullif(trim(p_order_payload->>'coupon_code'), '');
  v_coupon_discount := coalesce(
    nullif(p_order_payload->>'coupon_discount', '')::numeric(10, 2),
    0::numeric(10, 2)
  );
  v_wholesale_discount := coalesce(
    nullif(p_order_payload->>'wholesale_discount', '')::numeric(10, 2),
    0::numeric(10, 2)
  );
  v_tax_total := coalesce(nullif(p_order_payload->>'tax_total', '')::numeric(10, 2), 0::numeric(10, 2));
  v_shipping_fee := coalesce(nullif(p_order_payload->>'shipping_fee', '')::numeric(10, 2), 0::numeric(10, 2));
  v_grand_total := nullif(p_order_payload->>'grand_total', '')::numeric(10, 2);
  v_notes := nullif(trim(p_order_payload->>'notes'), '');

  if v_customer_account is null then
    raise exception 'customer_account is required';
  end if;

  if v_customer_name = '' then
    raise exception 'customer_name is required';
  end if;

  if v_customer_email = '' then
    raise exception 'customer_email is required';
  end if;

  if v_customer_phone = '' then
    raise exception 'customer_phone is required';
  end if;

  if v_requested_fulfillment_method is null then
    raise exception 'requested_fulfillment_method is required';
  end if;

  if v_requested_target_date is null then
    raise exception 'requested_target_date is required';
  end if;

  if v_shipping_address = '' or v_shipping_city = '' or v_shipping_postal_code = '' then
    raise exception 'Shipping address is required';
  end if;

  if v_grand_total is null or v_grand_total <= 0 then
    raise exception 'Order grand total must be greater than zero';
  end if;

  if v_subtotal is null then
    v_subtotal := greatest(
      v_grand_total - v_tax_total - v_shipping_fee + v_coupon_discount + v_wholesale_discount,
      0
    );
  end if;

  if v_cancel_token is null or v_tracking_token is null then
    raise exception 'cancel_token and tracking_token are required';
  end if;

  insert into public.orders (
    is_testing,
    order_type,
    status,
    invoice_number,
    cancel_token,
    tracking_token,
    customer_account,
    customer_name,
    customer_email,
    customer_phone,
    requested_fulfillment_method,
    requested_target_date,
    coupon_code,
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
    subtotal,
    coupon_discount,
    wholesale_discount,
    tax_total,
    shipping_fee,
    grand_total,
    notes,
    status_updated_at
  )
  values (
    v_is_testing,
    v_order_type,
    'pending'::public.order_status,
    null,
    v_cancel_token,
    v_tracking_token,
    v_customer_account,
    v_customer_name,
    v_customer_email,
    v_customer_phone,
    v_requested_fulfillment_method,
    v_requested_target_date,
    v_coupon_code,
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
    v_subtotal,
    v_coupon_discount,
    v_wholesale_discount,
    v_tax_total,
    v_shipping_fee,
    v_grand_total,
    v_notes,
    v_status_updated_at
  )
  returning id
  into v_order_id;

  update public.orders
  set invoice_number = public.format_order_invoice_number(v_order_id, now())
  where id = v_order_id
  returning invoice_number
  into v_invoice_number;

  perform public.insert_order_items_from_payload(v_order_id, v_order_type, p_items);

  select exists (
    select 1
    from public.order_items
    where order_id = v_order_id
  )
  into v_has_items;

  if not v_has_items then
    delete from public.orders where id = v_order_id;
    raise exception 'No valid order items found';
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'tracking_token', v_tracking_token,
    'cancel_token', v_cancel_token,
    'invoice_number', v_invoice_number
  );
end;
$$;

comment on function public.create_pending_catering_order(jsonb, jsonb) is
  'Creates a catering order in pending status (no payment). Admin quotes later; customer pays when status allows.';

grant execute on function public.create_pending_catering_order(jsonb, jsonb) to service_role;
