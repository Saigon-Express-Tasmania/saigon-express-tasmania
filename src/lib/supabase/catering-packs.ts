import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import {
  categoryMapById,
  type CategoryLookup,
} from "@/lib/product-category";
import type { ProductCategoryAssignment } from "@/lib/product-categories";
import {
  getPrimaryCategoryId,
  resolveProductCategoryIds,
  resolveProductCategoryLabel,
} from "@/lib/product-categories";
import {
  normalizeMenuImageUrls,
  parseMenuImageMore,
  pickMenuImageUrl,
  type MenuImageMoreEntry,
  type MenuImageUrls,
} from "@/types";
import { parseNumericCateringItemId } from "@/lib/catering-item-routes";
import { getProductCategoryAssignments } from "@/lib/product-categories";
import {
  buildProductCatalogPageResult,
  type ProductCatalogPageParams,
  type ProductCatalogPageResult,
} from "@/lib/product-catalog-page";
import type { SiteCategory } from "@/types";
import { getCategoriesByKind } from "./categories";
import { loadProductCategoriesByProductIds } from "./product-categories";
import {
  fetchCateringProductRowById,
  fetchCateringProductRows,
  fetchCateringProductsPage,
  type CateringProductRow,
} from "./products";

const CACHE_TAG = CACHE_TAGS.cateringPacks;

export const FEATURED_CATERING_PACK_CATEGORY = "Catering Packs";

export type CateringTierPrice = {
  size: string;
  price: string;
  serves: string;
};

export type CateringPack = {
  id: number;
  name: string;
  categoryId: number | null;
  categoryIds: number[];
  category: string;
  categoryAlias: string | null;
  serves: string | null;
  price: string | null;
  catalogUnitPrice: string | null;
  description: string;
  includes: string[];
  note: string | null;
  prices: CateringTierPrice[];
  tag: string;
  tagBg: string;
  img: string | null;
  imageUrls: MenuImageUrls;
  moreImages: MenuImageMoreEntry[];
  sortOrder: number;
  isAvailable: boolean;
  customizationIds: number[];
  customizationsDisabled: boolean;
};

function mapTierPrices(input: CateringProductRow["prices"]): CateringTierPrice[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        size: String(row.size ?? ""),
        price: String(row.price ?? ""),
        serves: String(row.serves ?? ""),
      };
    })
    .filter((item) => item.size && item.price && item.serves);
}

export function mapCateringPackRow(
  row: CateringProductRow,
  assignments: ProductCategoryAssignment[],
  categoryById: Map<number, CategoryLookup> = new Map(),
): CateringPack {
  const imageUrls = normalizeMenuImageUrls(row.image_urls);
  const moreImages = parseMenuImageMore(row.image_urls);
  const img =
    pickMenuImageUrl(imageUrls, [1920, 1024, 512, 256]) ??
    row.image_url?.trim() ??
    null;

  const categoryIds = resolveProductCategoryIds(assignments);
  const categoryId = getPrimaryCategoryId(assignments);
  const category =
    resolveProductCategoryLabel(assignments, categoryById) ||
    FEATURED_CATERING_PACK_CATEGORY;
  const categoryLookup =
    categoryId != null ? categoryById.get(categoryId) : undefined;

  return {
    id: Number(row.id),
    name: row.name,
    categoryId,
    categoryIds,
    category,
    categoryAlias: categoryLookup?.alias ?? null,
    serves: row.serves?.trim() || null,
    price: row.price?.trim() || null,
    catalogUnitPrice: row.unit_price?.trim() || null,
    description: row.description ?? "",
    includes: Array.isArray(row.includes)
      ? row.includes.map((value) => String(value))
      : [],
    note: row.note?.trim() || null,
    prices: mapTierPrices(row.prices),
    tag: row.tag ?? "",
    tagBg: row.tag_bg ?? "",
    img,
    imageUrls,
    moreImages,
    sortOrder: Number(row.sort_order ?? 0),
    isAvailable: Boolean(row.is_available),
    customizationIds: Array.isArray(row.customization_ids)
      ? row.customization_ids.map((id) => Number(id))
      : [],
    customizationsDisabled: Boolean(row.customizations_disabled),
  };
}

async function loadCateringPacks(): Promise<CateringPack[]> {
  const [rows, categories] = await Promise.all([
    fetchCateringProductRows(),
    getCategoriesByKind("catering"),
  ]);
  const categoriesByProductId = await loadProductCategoriesByProductIds(
    rows.map((row) => row.id),
  );
  const categoryById = categoryMapById(categories);
  return rows.map((row) =>
    mapCateringPackRow(
      row,
      getProductCategoryAssignments(categoriesByProductId, row.id),
      categoryById,
    ),
  );
}

/**
 * Paginated catering packs for a single category. Pass page categories from the RSC.
 * Category assignments come from the page query embed (no second round-trip).
 */
export async function getCateringPacksPage(
  params: ProductCatalogPageParams,
  categories: SiteCategory[],
): Promise<ProductCatalogPageResult<CateringPack>> {
  const { rows, totalCount, categoriesByProductId } =
    await fetchCateringProductsPage(params);
  const categoryById = categoryMapById(categories);
  const items = rows.map((row) =>
    mapCateringPackRow(
      row,
      getProductCategoryAssignments(categoriesByProductId, row.id),
      categoryById,
    ),
  );
  return buildProductCatalogPageResult(
    items,
    totalCount,
    params.page,
    params.pageSize,
  );
}

async function loadCateringItemById(id: number): Promise<CateringPack | null> {
  const [row, categories] = await Promise.all([
    fetchCateringProductRowById(id),
    getCategoriesByKind("catering"),
  ]);
  if (!row) return null;
  const categoriesByProductId = await loadProductCategoriesByProductIds([row.id]);
  return mapCateringPackRow(
    row,
    getProductCategoryAssignments(categoriesByProductId, row.id),
    categoryMapById(categories),
  );
}

export const getCateringPacks = unstable_cache(
  loadCateringPacks,
  [CACHE_TAG],
  {
    revalidate: SHORT_REVALIDATE_SECONDS,
    tags: [CACHE_TAG],
  },
);

export function getCateringItemById(id: number): Promise<CateringPack | null> {
  return unstable_cache(
    () => loadCateringItemById(id),
    [CACHE_TAG, "catering-item", "id", String(id)],
    {
      revalidate: SHORT_REVALIDATE_SECONDS,
      tags: [CACHE_TAG, `${CACHE_TAG}-item-${id}`],
    },
  )();
}

export function getCateringItemFromParam(
  param: string,
): Promise<CateringPack | null> {
  const id = parseNumericCateringItemId(param);
  if (id === null) return Promise.resolve(null);
  return getCateringItemById(id);
}
