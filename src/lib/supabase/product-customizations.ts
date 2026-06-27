import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import type {
  ProductCustomizationGroup,
  ProductCustomizationOption,
  ProductCustomizationsCatalog,
} from "@/lib/product-customizations";
import { SERVER_CACHE_INSTANCE_ID } from "./cache-instance";
import { createServerSupabaseClient } from "./server";

const CACHE_TAG = CACHE_TAGS.productCustomizations;

type OptionRow = {
  id: number;
  key: string;
  title: string;
  price: number | string;
  sort_order: number;
};

type GroupRow = {
  id: number;
  kind: "menu" | "wholesale" | "catering";
  key: string;
  title: string;
  type: "single" | "multi";
  required: boolean;
  sort_order: number;
  product_customization_options?: OptionRow[] | null;
};

function mapOptionRow(row: OptionRow): ProductCustomizationOption {
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    price: Number(row.price) || 0,
    sortOrder: row.sort_order,
  };
}

function mapGroupRow(row: GroupRow): ProductCustomizationGroup {
  const options = (row.product_customization_options ?? []).map(mapOptionRow);
  return {
    id: row.id,
    kind: row.kind,
    key: row.key,
    title: row.title,
    type: row.type,
    required: row.required,
    sortOrder: row.sort_order,
    options,
  };
}

async function loadProductCustomizationsCatalog(): Promise<ProductCustomizationsCatalog> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("product_customizations")
    .select(
      `
      id,
      kind,
      key,
      title,
      type,
      required,
      sort_order,
      product_customization_options (
        id,
        key,
        title,
        price,
        sort_order
      )
    `,
    )
    .order("kind", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`product_customizations: ${error.message}`);
  }

  const catalog: ProductCustomizationsCatalog = {};
  for (const row of data ?? []) {
    const group = mapGroupRow(row as GroupRow);
    catalog[group.id] = group;
  }
  return catalog;
}

/**
 * All product customisation groups and options, cached for public menu usage.
 */
export const getProductCustomizationsCatalog = unstable_cache(
  loadProductCustomizationsCatalog,
  [CACHE_TAG, SERVER_CACHE_INSTANCE_ID],
  { revalidate: SHORT_REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);
