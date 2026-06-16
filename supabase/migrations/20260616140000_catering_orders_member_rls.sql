-- Members can list their own catering orders in the portal.

create policy "Members read own catering orders"
  on public.orders
  for select
  to authenticated
  using (
    customer_account = auth.uid()
    and order_type = 'catering'::public.order_type
  );

create policy "Members read own catering order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders as o
      where o.id = order_items.order_id
        and o.customer_account = auth.uid()
        and o.order_type = 'catering'::public.order_type
    )
  );

create policy "Members read own catering order payments"
  on public.order_payments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders as o
      where o.id = order_payments.order_id
        and o.customer_account = auth.uid()
        and o.order_type = 'catering'::public.order_type
    )
  );
