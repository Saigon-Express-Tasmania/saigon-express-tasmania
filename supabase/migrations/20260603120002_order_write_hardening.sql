-- Prevent non-admin clients from writing order headers and child rows directly.
-- Checkout and webhooks use service_role; admin UI uses is_admin() RLS policies.
--
-- Restrictive policies below apply only to authenticated (browser) clients.
-- service_role bypasses RLS in Supabase and retains full table access for edge functions.

revoke insert, update, delete on public.draft_orders from anon;
revoke insert, update, delete on public.orders from anon;
revoke insert, update, delete on public.archived_orders from anon;
revoke insert, update, delete on public.order_items from anon;
revoke insert, update, delete on public.order_payments from anon;
revoke insert, update, delete on public.order_fulfillments from anon;

-- Reaffirm service_role can read/write all order lifecycle tables (checkout, webhooks, RPCs).
grant all on public.draft_orders to service_role;
grant all on public.orders to service_role;
grant all on public.archived_orders to service_role;
grant all on public.order_items to service_role;
grant all on public.order_payments to service_role;
grant all on public.order_fulfillments to service_role;

-- Restrictive policies: even if a permissive policy is added later, only admins may write.
create policy "Only admins insert orders"
  on public.orders
  as restrictive
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Only admins update orders"
  on public.orders
  as restrictive
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Only admins delete orders"
  on public.orders
  as restrictive
  for delete
  to authenticated
  using (public.is_admin());

create policy "Only admins insert draft_orders"
  on public.draft_orders
  as restrictive
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Only admins update draft_orders"
  on public.draft_orders
  as restrictive
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Only admins delete draft_orders"
  on public.draft_orders
  as restrictive
  for delete
  to authenticated
  using (public.is_admin());

create policy "Only admins insert archived_orders"
  on public.archived_orders
  as restrictive
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Only admins update archived_orders"
  on public.archived_orders
  as restrictive
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Only admins delete archived_orders"
  on public.archived_orders
  as restrictive
  for delete
  to authenticated
  using (public.is_admin());

create policy "Only admins insert order_items"
  on public.order_items
  as restrictive
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Only admins update order_items"
  on public.order_items
  as restrictive
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Only admins delete order_items"
  on public.order_items
  as restrictive
  for delete
  to authenticated
  using (public.is_admin());

create policy "Only admins insert order_payments"
  on public.order_payments
  as restrictive
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Only admins update order_payments"
  on public.order_payments
  as restrictive
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Only admins delete order_payments"
  on public.order_payments
  as restrictive
  for delete
  to authenticated
  using (public.is_admin());

create policy "Only admins insert order_fulfillments"
  on public.order_fulfillments
  as restrictive
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Only admins update order_fulfillments"
  on public.order_fulfillments
  as restrictive
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Only admins delete order_fulfillments"
  on public.order_fulfillments
  as restrictive
  for delete
  to authenticated
  using (public.is_admin());
