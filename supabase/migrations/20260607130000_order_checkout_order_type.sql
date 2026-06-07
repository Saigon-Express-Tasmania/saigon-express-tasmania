-- Persist order_type through checkout (draft -> paid order RPCs).

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

  if p_draft_order_id is not null then
    delete from public.draft_orders where id = p_draft_order_id;
  end if;

  return v_order_id;
end;
$$;
