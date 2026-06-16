-- Members may cancel (archive + delete header) their own catering orders
-- while still pending quotation or awaiting payment.

create policy "Members delete own cancellable catering orders"
  on public.orders
  for delete
  to authenticated
  using (
    customer_account = auth.uid()
    and order_type = 'catering'::public.order_type
    and status in (
      'pending'::public.order_status,
      'awaiting_payment'::public.order_status
    )
  );

drop policy if exists "Only admins delete orders" on public.orders;

create policy "Only admins delete orders"
  on public.orders
  as restrictive
  for delete
  to authenticated
  using (
    public.is_admin()
    or (
      customer_account = auth.uid()
      and order_type = 'catering'::public.order_type
      and status in (
        'pending'::public.order_status,
        'awaiting_payment'::public.order_status
      )
    )
  );

create policy "Members archive own cancellable catering orders"
  on public.archived_orders
  for insert
  to authenticated
  with check (
    customer_account = auth.uid()
    and order_type = 'catering'::public.order_type
    and status in (
      'pending'::public.order_status,
      'awaiting_payment'::public.order_status
    )
  );

drop policy if exists "Only admins insert archived_orders" on public.archived_orders;

create policy "Only admins insert archived_orders"
  on public.archived_orders
  as restrictive
  for insert
  to authenticated
  with check (
    public.is_admin()
    or (
      customer_account = auth.uid()
      and order_type = 'catering'::public.order_type
      and status in (
        'pending'::public.order_status,
        'awaiting_payment'::public.order_status
      )
    )
  );
