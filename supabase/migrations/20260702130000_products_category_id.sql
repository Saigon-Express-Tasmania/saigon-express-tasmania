-- Link products to categories by id instead of ambiguous text names.

alter table public.products
  add column category_id bigint references public.categories (id) on delete set null;

comment on column public.products.category_id is
  'FK to public.categories. Preferred category link; legacy products.category text is retained for transition.';

create index products_category_id_idx
  on public.products (category_id);

-- Seed wholesale categories that exist on products but not yet in categories.
insert into public.categories (kind, alias, name)
select distinct
  'wholesale'::public.category_kind,
  trim(both '-' from lower(regexp_replace(trim(p.category), '[^a-zA-Z0-9]+', '-', 'g'))),
  trim(p.category)
from public.products p
where p.product_type = 'wholesale'::public.product_type
  and trim(p.category) <> ''
  and not exists (
    select 1
    from public.categories c
    where c.kind = 'wholesale'::public.category_kind
      and (
        c.name = trim(p.category)
        or c.alias = trim(both '-' from lower(regexp_replace(trim(p.category), '[^a-zA-Z0-9]+', '-', 'g')))
      )
  );

-- Backfill category_id from legacy products.category text matched to categories.name.
update public.products p
set category_id = c.id
from public.categories c
where trim(p.category) <> ''
  and (
    (p.product_type = 'alacarte'::public.product_type and c.kind = 'menu'::public.category_kind)
    or (p.product_type = 'wholesale'::public.product_type and c.kind = 'wholesale'::public.category_kind)
    or (p.product_type = 'catering'::public.product_type and c.kind = 'catering'::public.category_kind)
  )
  and (
    trim(p.category) = c.name
    or trim(p.category) = c.alias
    or regexp_replace(trim(p.category), '[''’]', '''', 'g')
      = regexp_replace(c.name, '[''’]', '''', 'g')
  );
