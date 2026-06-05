export type MenuItemNutritionalInformation = {
  label: string;
  perServing: string;
  perPortion: string;
  servingSize: string;
  portionSize: string;
};

export type MenuItemIngredient = {
  nutritionalInformation: Record<string, MenuItemNutritionalInformation>;
  contents: string;
  foodHistory: string;
  allergens: string;
  storageInstructions: string;
  preparationInstructions: string;
  cookingInstructions: string;
  servingInstructions: string;
  servingSize: string;
  portionSize: string;
};

export function emptyMenuItemNutritionalInformation(): MenuItemNutritionalInformation {
  return {
    label: '',
    perServing: '',
    perPortion: '',
    servingSize: '',
    portionSize: '',
  };
}

export function emptyMenuItemIngredient(): MenuItemIngredient {
  return {
    nutritionalInformation: {},
    contents: '',
    foodHistory: '',
    allergens: '',
    storageInstructions: '',
    preparationInstructions: '',
    cookingInstructions: '',
    servingInstructions: '',
    servingSize: '',
    portionSize: '',
  };
}

export function parseMenuItemIngredient(value: unknown): MenuItemIngredient {
  const empty = emptyMenuItemIngredient();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return empty;
  }

  const row = value as Record<string, unknown>;
  const nutritionalInformation: Record<string, MenuItemNutritionalInformation> =
    {};

  const rawNutrition = row.nutritionalInformation;
  if (
    rawNutrition &&
    typeof rawNutrition === 'object' &&
    !Array.isArray(rawNutrition)
  ) {
    for (const [key, entry] of Object.entries(rawNutrition)) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const nutrient = entry as Record<string, unknown>;
      nutritionalInformation[key] = {
        label: String(nutrient.label ?? ''),
        perServing: String(nutrient.perServing ?? ''),
        perPortion: String(nutrient.perPortion ?? ''),
        servingSize: String(nutrient.servingSize ?? ''),
        portionSize: String(nutrient.portionSize ?? ''),
      };
    }
  }

  return {
    nutritionalInformation,
    contents: String(row.contents ?? ''),
    foodHistory: String(row.foodHistory ?? ''),
    allergens: String(row.allergens ?? ''),
    storageInstructions: String(row.storageInstructions ?? ''),
    preparationInstructions: String(row.preparationInstructions ?? ''),
    cookingInstructions: String(row.cookingInstructions ?? ''),
    servingInstructions: String(row.servingInstructions ?? ''),
    servingSize: String(row.servingSize ?? ''),
    portionSize: String(row.portionSize ?? ''),
  };
}

function trimNutrient(entry: MenuItemNutritionalInformation) {
  return {
    label: entry.label.trim(),
    perServing: entry.perServing.trim(),
    perPortion: entry.perPortion.trim(),
    servingSize: entry.servingSize.trim(),
    portionSize: entry.portionSize.trim(),
  };
}

export function serializeMenuItemIngredient(
  form: MenuItemIngredient,
): MenuItemIngredient {
  const nutritionalInformation = Object.entries(
    form.nutritionalInformation,
  ).reduce<Record<string, MenuItemNutritionalInformation>>(
    (acc, [key, entry]) => {
      const trimmedKey = key.trim();
      const trimmed = trimNutrient(entry);
      if (trimmedKey && Object.values(trimmed).some(Boolean)) {
        acc[trimmedKey] = trimmed;
      }
      return acc;
    },
    {},
  );

  return {
    nutritionalInformation,
    contents: form.contents.trim(),
    foodHistory: form.foodHistory.trim(),
    allergens: form.allergens.trim(),
    storageInstructions: form.storageInstructions.trim(),
    preparationInstructions: form.preparationInstructions.trim(),
    cookingInstructions: form.cookingInstructions.trim(),
    servingInstructions: form.servingInstructions.trim(),
    servingSize: form.servingSize.trim(),
    portionSize: form.portionSize.trim(),
  };
}

export function parseImportedMenuItemIngredientsJson(
  raw: string,
  menuItemId?: number,
): MenuItemIngredient {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Paste JSON data to import.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('Invalid JSON. Check the pasted text and try again.');
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      throw new Error('JSON array is empty.');
    }

    const entry =
      parsed.length === 1
        ? parsed[0]
        : menuItemId != null
          ? parsed.find(
              (row) =>
                row &&
                typeof row === 'object' &&
                (row as { menuItemId?: unknown }).menuItemId === menuItemId,
            )
          : parsed[0];

    if (!entry || typeof entry !== 'object') {
      throw new Error(
        menuItemId != null
          ? `No entry found for menu item ID ${menuItemId}.`
          : 'Could not read ingredients from the JSON array.',
      );
    }

    const row = entry as { ingredients?: unknown };
    if (row.ingredients != null) {
      return parseMenuItemIngredient(row.ingredients);
    }

    return parseMenuItemIngredient(entry);
  }

  if (parsed && typeof parsed === 'object' && 'ingredients' in parsed) {
    return parseMenuItemIngredient(
      (parsed as { ingredients: unknown }).ingredients,
    );
  }

  return parseMenuItemIngredient(parsed);
}

export function isMenuItemIngredientEmpty(
  ingredients: MenuItemIngredient,
): boolean {
  const serialized = serializeMenuItemIngredient(ingredients);
  if (Object.keys(serialized.nutritionalInformation).length > 0) return false;
  return !(
    serialized.contents ||
    serialized.foodHistory ||
    serialized.allergens ||
    serialized.storageInstructions ||
    serialized.preparationInstructions ||
    serialized.cookingInstructions ||
    serialized.servingInstructions ||
    serialized.servingSize ||
    serialized.portionSize
  );
}
