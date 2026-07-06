-- Unpublish Catering Project bulk-imported products.
-- Targets the 476 products inserted by:
--   20260705140000_cateringproject_products_bulk.sql
-- Product ids: 620001..620476

update public.products
set is_published = false
where id between 620001 and 620476;
