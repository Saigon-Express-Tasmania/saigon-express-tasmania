export const PRODUCT_SHIPPING_SELECT =
  'is_shippable, ship_weight_kg, ship_length_cm, ship_width_cm, ship_height_cm';

export type ProductShippingInput = {
  is_shippable: boolean;
  ship_weight_kg: string;
  ship_length_cm: string;
  ship_width_cm: string;
  ship_height_cm: string;
};

export type ProductShippingRow = {
  is_shippable: boolean;
  ship_weight_kg: number | null;
  ship_length_cm: number | null;
  ship_width_cm: number | null;
  ship_height_cm: number | null;
};

export function emptyProductShippingInput(): ProductShippingInput {
  return {
    is_shippable: false,
    ship_weight_kg: '',
    ship_length_cm: '',
    ship_width_cm: '',
    ship_height_cm: '',
  };
}

export function productShippingFromRow(
  row: Partial<ProductShippingRow> | null | undefined,
): ProductShippingInput {
  return {
    is_shippable: Boolean(row?.is_shippable),
    ship_weight_kg:
      row?.ship_weight_kg != null ? String(row.ship_weight_kg) : '',
    ship_length_cm:
      row?.ship_length_cm != null ? String(row.ship_length_cm) : '',
    ship_width_cm:
      row?.ship_width_cm != null ? String(row.ship_width_cm) : '',
    ship_height_cm:
      row?.ship_height_cm != null ? String(row.ship_height_cm) : '',
  };
}

export function productShippingToPayload(input: ProductShippingInput): ProductShippingRow {
  if (!input.is_shippable) {
    return {
      is_shippable: false,
      ship_weight_kg: null,
      ship_length_cm: null,
      ship_width_cm: null,
      ship_height_cm: null,
    };
  }

  return {
    is_shippable: true,
    ship_weight_kg: Number(input.ship_weight_kg),
    ship_length_cm: Number(input.ship_length_cm),
    ship_width_cm: Number(input.ship_width_cm),
    ship_height_cm: Number(input.ship_height_cm),
  };
}

export function validateProductShippingInput(
  input: ProductShippingInput,
): string | null {
  if (!input.is_shippable) return null;

  const fields: Array<{ label: string; value: string }> = [
    { label: 'weight (kg)', value: input.ship_weight_kg },
    { label: 'length (cm)', value: input.ship_length_cm },
    { label: 'width (cm)', value: input.ship_width_cm },
    { label: 'height (cm)', value: input.ship_height_cm },
  ];

  for (const field of fields) {
    const num = Number(field.value);
    if (!field.value.trim() || !Number.isFinite(num) || num <= 0) {
      return `Shipping ${field.label} must be a positive number when shippable is enabled.`;
    }
  }

  return null;
}
