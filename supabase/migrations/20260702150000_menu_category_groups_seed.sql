-- Seed menu category groups and link menu categories by id.
-- Mapping source:
--   Signatures & Specials     -> 26, 44
--   Vietnamese Mains        -> 4, 51, 46, 49, 7, 45, 48
--   Street Food & Entrées   -> 2, 9, 3, 50
--   General Mains           -> 43, 47, 10
--   Drinks & Extras         -> 32, 13, 31

insert into public.category_groups (name, alias, sort_order, description)
values
  (
    'Signatures & Specials',
    'signatures-specials',
    1,
    'Saigon Top Picks, Chef''s Suggestions'
  ),
  (
    'Vietnamese Mains',
    'vietnamese-mains',
    2,
    'Pho, Bún Bò Huế, Noodle Salad (Bun), Stir Fried Noodles, Viet Rice (Com), Fried Rice, Soup'
  ),
  (
    'Street Food & Entrées',
    'street-food-entrees',
    3,
    'Bánh Mì, Bao Buns, Rice Paper Rolls, Bánh Xèo'
  ),
  (
    'General Mains',
    'general-mains',
    4,
    'Main Dishes, Chicken & Burger, Omelette'
  ),
  (
    'Drinks & Extras',
    'drinks-extras',
    5,
    'Drinks & Desserts, Drinks, Add-Ons'
  )
on conflict (alias) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

with group_map (group_alias, category_id) as (
  values
    ('signatures-specials', 26::bigint),
    ('signatures-specials', 44::bigint),
    ('vietnamese-mains', 4::bigint),
    ('vietnamese-mains', 51::bigint),
    ('vietnamese-mains', 46::bigint),
    ('vietnamese-mains', 49::bigint),
    ('vietnamese-mains', 7::bigint),
    ('vietnamese-mains', 45::bigint),
    ('vietnamese-mains', 48::bigint),
    ('street-food-entrees', 2::bigint),
    ('street-food-entrees', 9::bigint),
    ('street-food-entrees', 3::bigint),
    ('street-food-entrees', 50::bigint),
    ('general-mains', 43::bigint),
    ('general-mains', 47::bigint),
    ('general-mains', 10::bigint),
    ('drinks-extras', 32::bigint),
    ('drinks-extras', 13::bigint),
    ('drinks-extras', 31::bigint)
)
update public.categories c
set category_group_id = g.id
from group_map gm
join public.category_groups g on g.alias = gm.group_alias
where c.id = gm.category_id;
