-- Many-to-many link between products and categories.
-- products.category_id remains the denormalized primary category during transition;
-- it is kept in sync when a junction row is marked is_primary.

create table public.product_categories (
  product_id bigint not null references public.products (id) on delete cascade,
  category_id bigint not null references public.categories (id) on delete cascade,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

comment on table public.product_categories is
  'Assigns one or more categories to a product. Use is_primary for the canonical category; products.category_id mirrors the primary row for legacy callers.';
comment on column public.product_categories.is_primary is
  'When true, this category is the product primary category and is mirrored to products.category_id.';
comment on column public.product_categories.sort_order is
  'Display order when a product appears under multiple categories.';

create index product_categories_product_id_sort_order_idx
  on public.product_categories (product_id, sort_order, category_id);

create index product_categories_category_id_product_id_idx
  on public.product_categories (category_id, product_id);

create unique index product_categories_one_primary_per_product_idx
  on public.product_categories (product_id)
  where is_primary;

-- Ensure product_type and category.kind align (alacarte↔menu, wholesale↔wholesale, catering↔catering).
create or replace function public.product_categories_validate_kind()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  product_type_val public.product_type;
  category_kind_val public.category_kind;
begin
  select p.product_type
  into product_type_val
  from public.products p
  where p.id = new.product_id;

  if product_type_val is null then
    raise exception 'product % not found', new.product_id;
  end if;

  select c.kind
  into category_kind_val
  from public.categories c
  where c.id = new.category_id;

  if category_kind_val is null then
    raise exception 'category % not found', new.category_id;
  end if;

  if not (
    (product_type_val = 'alacarte'::public.product_type and category_kind_val = 'menu'::public.category_kind)
    or (product_type_val = 'wholesale'::public.product_type and category_kind_val = 'wholesale'::public.category_kind)
    or (product_type_val = 'catering'::public.product_type and category_kind_val = 'catering'::public.category_kind)
  ) then
    raise exception 'product type % cannot be linked to category kind %',
      product_type_val, category_kind_val;
  end if;

  return new;
end;
$$;

comment on function public.product_categories_validate_kind() is
  'Ensures product_categories rows only link a product to categories of the matching channel kind.';

create trigger product_categories_validate_kind
  before insert or update on public.product_categories
  for each row
  execute function public.product_categories_validate_kind();

-- Keep products.category_id aligned with the primary junction row.
create or replace function public.product_categories_sync_primary()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_product_id bigint;
begin
  target_product_id := coalesce(new.product_id, old.product_id);

  if tg_op = 'DELETE' then
    if old.is_primary then
      update public.products p
      set category_id = (
        select pc.category_id
        from public.product_categories pc
        where pc.product_id = target_product_id
          and pc.is_primary
        order by pc.sort_order, pc.category_id
        limit 1
      )
      where p.id = target_product_id;
    end if;
    return old;
  end if;

  if new.is_primary then
    update public.product_categories pc
    set is_primary = false
    where pc.product_id = new.product_id
      and pc.category_id <> new.category_id
      and pc.is_primary;

    update public.products p
    set category_id = new.category_id
    where p.id = new.product_id;
  elsif tg_op = 'UPDATE' and old.is_primary and not new.is_primary then
    update public.products p
    set category_id = (
      select pc.category_id
      from public.product_categories pc
      where pc.product_id = new.product_id
        and pc.is_primary
      order by pc.sort_order, pc.category_id
      limit 1
    )
    where p.id = new.product_id;
  end if;

  return new;
end;
$$;

comment on function public.product_categories_sync_primary() is
  'Mirrors the primary product_categories row to products.category_id and enforces a single primary per product.';

create trigger product_categories_sync_primary
  after insert or update or delete on public.product_categories
  for each row
  execute function public.product_categories_sync_primary();

comment on column public.products.category_id is
  'Denormalized primary category (FK). Prefer product_categories with is_primary = true; kept in sync by trigger.';

-- Backfill existing single-category assignments.
insert into public.product_categories (product_id, category_id, is_primary, sort_order)
select p.id, p.category_id, true, coalesce(p.sort_order, 0)
from public.products p
where p.category_id is not null
on conflict (product_id, category_id) do nothing;

alter table public.product_categories enable row level security;

create policy "Anyone can read categories for available products"
  on public.product_categories
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_categories.product_id
        and p.is_available = true
    )
  );

create policy "Admins can read all product categories"
  on public.product_categories
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert product categories"
  on public.product_categories
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update product categories"
  on public.product_categories
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete product categories"
  on public.product_categories
  for delete
  to authenticated
  using (public.is_admin());

grant select on public.product_categories to anon, authenticated;
grant insert, update, delete on public.product_categories to authenticated;
grant all on public.product_categories to service_role;
