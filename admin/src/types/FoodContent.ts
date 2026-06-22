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

export type FoodContentFieldDef = {
  key: keyof FoodContent;
  label: string;
};

export type FoodContentGroupDef = {
  id: string;
  title: string;
  description?: string;
  fields: FoodContentFieldDef[];
};

export const FOOD_CONTENT_GROUPS: FoodContentGroupDef[] = [
  {
    id: 'meat',
    title: 'Meat & poultry',
    description: 'Animal proteins present in the dish.',
    fields: [
      { key: 'contains_pork', label: 'Contains pork' },
      { key: 'contains_beef', label: 'Contains beef' },
      { key: 'contains_chicken', label: 'Contains chicken' },
      { key: 'contains_duck', label: 'Contains duck' },
      { key: 'contains_lamb', label: 'Contains lamb' },
      { key: 'contains_goat', label: 'Contains goat' },
      { key: 'contains_game', label: 'Contains game' },
      { key: 'contains_turkey', label: 'Contains turkey' },
    ],
  },
  {
    id: 'seafood',
    title: 'Seafood',
    fields: [
      { key: 'contains_shellfish', label: 'Contains shellfish' },
      { key: 'contains_fish', label: 'Contains fish' },
      { key: 'contains_crustaceans', label: 'Contains crustaceans' },
      { key: 'contains_molluscs', label: 'Contains molluscs' },
    ],
  },
  {
    id: 'nuts-legumes',
    title: 'Nuts & legumes',
    fields: [
      { key: 'contains_peanuts', label: 'Contains peanuts' },
      { key: 'contains_tree_nuts', label: 'Contains tree nuts' },
      { key: 'contains_almonds', label: 'Contains almonds' },
      { key: 'contains_cashews', label: 'Contains cashews' },
      { key: 'contains_walnuts', label: 'Contains walnuts' },
      { key: 'contains_soy', label: 'Contains soy' },
    ],
  },
  {
    id: 'grains-eggs',
    title: 'Grains, gluten & eggs',
    fields: [
      { key: 'contains_wheat', label: 'Contains wheat' },
      { key: 'contains_gluten', label: 'Contains gluten' },
      { key: 'contains_eggs', label: 'Contains eggs' },
    ],
  },
  {
    id: 'dairy',
    title: 'Dairy',
    fields: [
      { key: 'contains_dairy', label: 'Contains dairy' },
      { key: 'contains_milk', label: 'Contains milk' },
      { key: 'contains_cheese', label: 'Contains cheese' },
    ],
  },
  {
    id: 'other-allergens',
    title: 'Other allergens',
    fields: [
      { key: 'contains_sesame', label: 'Contains sesame' },
      { key: 'contains_mustard', label: 'Contains mustard' },
      { key: 'contains_celery', label: 'Contains celery' },
      { key: 'contains_lupin', label: 'Contains lupin' },
      { key: 'contains_sulphites', label: 'Contains sulphites' },
    ],
  },
  {
    id: 'dietary',
    title: 'Dietary labels',
    description: 'Positive claims about what the dish is suitable for.',
    fields: [
      { key: 'is_gluten_free', label: 'Gluten free' },
      { key: 'is_dairy_free', label: 'Dairy free' },
      { key: 'is_lactose_free', label: 'Lactose free' },
      { key: 'is_vegan', label: 'Vegan' },
      { key: 'is_vegetarian', label: 'Vegetarian' },
      { key: 'is_halal', label: 'Halal' },
      { key: 'is_kosher', label: 'Kosher' },
      { key: 'is_non_gmo', label: 'Non-GMO' },
      { key: 'is_organic', label: 'Organic' },
      { key: 'is_sugar_free', label: 'Sugar free' },
      { key: 'is_low_sodium', label: 'Low sodium' },
      { key: 'is_keto_friendly', label: 'Keto friendly' },
    ],
  },
  {
    id: 'attributes',
    title: 'Product attributes',
    fields: [
      { key: 'is_spicy', label: 'Spicy' },
      { key: 'contains_alcohol', label: 'Contains alcohol' },
      { key: 'contains_caffeine', label: 'Contains caffeine' },
      { key: 'is_raw', label: 'Raw / uncooked' },
      { key: 'is_frozen', label: 'Frozen product' },
      { key: 'is_ready_to_eat', label: 'Ready to eat' },
    ],
  },
];

const FOOD_CONTENT_KEYS = FOOD_CONTENT_GROUPS.flatMap((group) =>
  group.fields.map((field) => field.key),
) as (keyof FoodContent)[];

export function emptyFoodContent(): FoodContent {
  return Object.fromEntries(
    FOOD_CONTENT_KEYS.map((key) => [key, false]),
  ) as FoodContent;
}

export function parseFoodContent(value: unknown): FoodContent {
  const empty = emptyFoodContent();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return empty;
  }

  const row = value as Record<string, unknown>;
  const parsed = { ...empty };

  for (const key of FOOD_CONTENT_KEYS) {
    if (key in row) {
      parsed[key] = Boolean(row[key]);
    }
  }

  return parsed;
}

export function isFoodContentEmpty(value: FoodContent): boolean {
  return FOOD_CONTENT_KEYS.every((key) => !value[key]);
}

export function serializeFoodContent(value: FoodContent): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const key of FOOD_CONTENT_KEYS) {
    if (value[key]) {
      result[key] = true;
    }
  }
  return result;
}

export function countActiveFoodContentFlags(value: FoodContent): number {
  return FOOD_CONTENT_KEYS.filter((key) => value[key]).length;
}
