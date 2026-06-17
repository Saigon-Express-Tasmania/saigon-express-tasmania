-- Atomic cancel for pending guest/member catering orders.

create or replace function public.cancel_catering_order(
  p_order_id bigint,
  p_cancel_token text,
  p_customer_account uuid default null,
  p_archived_reason text default 'cancelled_by_customer'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_has_paid_payment boolean;
begin
  if p_order_id is null or p_order_id <= 0 then
    raise exception 'Invalid order id';
  end if;

  if p_cancel_token is null or trim(p_cancel_token) = '' then
    raise exception 'cancel_token is required';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  if v_order.order_type is distinct from 'catering'::public.order_type then
    raise exception 'Only catering orders can be cancelled with this function';
  end if;

  if v_order.cancel_token is distinct from trim(p_cancel_token) then
    raise exception 'Invalid cancel token';
  end if;

  if p_customer_account is not null
    and v_order.customer_account is distinct from p_customer_account then
    raise exception 'Unauthorized';
  end if;

  if v_order.status is distinct from 'pending'::public.order_status then
    raise exception 'Only pending catering orders can be cancelled';
  end if;

  select exists (
    select 1
    from public.order_payments as op
    where op.order_id = v_order.id
      and op.status = 'paid'::public.order_payment_status
  )
  into v_has_paid_payment;

  if v_has_paid_payment then
    raise exception 'Paid orders cannot be cancelled';
  end if;

  v_order.status := 'cancelled'::public.order_status;
  v_order.status_updated_at := now();

  insert into public.archived_orders (
    id,
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
    store_id,
    requested_fulfillment_method,
    requested_target_date,
    requested_pick_up_store_id,
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
    po_number,
    subtotal,
    coupon_discount,
    wholesale_discount,
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
    v_order.invoice_number,
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
    v_order.coupon_code,
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
    v_order.coupon_discount,
    v_order.wholesale_discount,
    v_order.tax_total,
    v_order.shipping_fee,
    v_order.grand_total,
    v_order.notes,
    coalesce(nullif(trim(p_archived_reason), ''), 'cancelled_by_customer'),
    now(),
    v_order.status_updated_at,
    v_order.created_at,
    now()
  );

  delete from public.orders where id = v_order.id;

  return v_order.id;
end;
$$;

comment on function public.cancel_catering_order(bigint, text, uuid, text) is
  'Locks a catering order, verifies pending/unpaid state, archives as cancelled, and deletes the live header.';

grant execute on function public.cancel_catering_order(bigint, text, uuid, text) to service_role;
