export type FoodContent = {
  contains_pork: boolean;
  contains_beef: boolean;
  contains_chicken: boolean;
  contains_duck: boolean;
  contains_goat: boolean;
  contains_game: boolean;
  contains_turkey: boolean;
  contains_lamb: boolean;
  contains_shellfish: boolean;
  contains_fish: boolean;
  contains_crustaceans: boolean;
  contains_molluscs: boolean;
  contains_peanuts: boolean;
  contains_tree_nuts: boolean;
  contains_almonds: boolean;
  contains_cashews: boolean;
  contains_walnuts: boolean;
  contains_soy: boolean;
  contains_wheat: boolean;
  contains_gluten: boolean;
  contains_eggs: boolean;
  contains_dairy: boolean;
  contains_milk: boolean;
  contains_cheese: boolean;
  contains_sesame: boolean;
  contains_mustard: boolean;
  contains_celery: boolean;
  contains_lupin: boolean;
  contains_sulphites: boolean;
  is_gluten_free: boolean;
  is_dairy_free: boolean;
  is_lactose_free: boolean;
  is_vegan: boolean;
  is_vegetarian: boolean;
  is_halal: boolean;
  is_kosher: boolean;
  is_non_gmo: boolean;
  is_organic: boolean;
  is_sugar_free: boolean;
  is_low_sodium: boolean;
  is_keto_friendly: boolean;
  is_spicy: boolean;
  contains_alcohol: boolean;
  contains_caffeine: boolean;
  is_raw: boolean;
  is_frozen: boolean;
  is_ready_to_eat: boolean;
};

export const FOOD_CONTENT_FIELD_ORDER = [
  "contains_pork",
  "contains_beef",
  "contains_chicken",
  "contains_duck",
  "contains_lamb",
  "contains_goat",
  "contains_game",
  "contains_turkey",
  "contains_shellfish",
  "contains_fish",
  "contains_crustaceans",
  "contains_molluscs",
  "contains_peanuts",
  "contains_tree_nuts",
  "contains_almonds",
  "contains_cashews",
  "contains_walnuts",
  "contains_soy",
  "contains_wheat",
  "contains_gluten",
  "contains_eggs",
  "contains_dairy",
  "contains_milk",
  "contains_cheese",
  "contains_sesame",
  "contains_mustard",
  "contains_celery",
  "contains_lupin",
  "contains_sulphites",
  "is_gluten_free",
  "is_dairy_free",
  "is_lactose_free",
  "is_vegan",
  "is_vegetarian",
  "is_halal",
  "is_kosher",
  "is_non_gmo",
  "is_organic",
  "is_sugar_free",
  "is_low_sodium",
  "is_keto_friendly",
  "is_spicy",
  "contains_alcohol",
  "contains_caffeine",
  "is_raw",
  "is_frozen",
  "is_ready_to_eat",
] as const satisfies readonly (keyof FoodContent)[];

export function emptyFoodContent(): FoodContent {
  return Object.fromEntries(
    FOOD_CONTENT_FIELD_ORDER.map((key) => [key, false]),
  ) as FoodContent;
}

export function parseFoodContent(value: unknown): FoodContent {
  const empty = emptyFoodContent();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return empty;
  }

  const row = value as Record<string, unknown>;
  const parsed = { ...empty };

  for (const key of FOOD_CONTENT_FIELD_ORDER) {
    if (key in row) {
      parsed[key] = Boolean(row[key]);
    }
  }

  return parsed;
}

export function getActiveFoodContentKeys(
  value: FoodContent,
): (keyof FoodContent)[] {
  return FOOD_CONTENT_FIELD_ORDER.filter((key) => value[key]);
}
