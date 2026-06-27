import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { parseNumericCateringItemId } from "@/lib/catering-item-routes";
import {
  normalizeMenuImageUrls,
  parseMenuImageMore,
  pickMenuImageUrl,
  type MenuImageMoreEntry,
  type MenuImageUrls,
} from "@/types";
import { SERVER_CACHE_INSTANCE_ID } from "./cache-instance";
import {
  fetchCateringProductRowById,
  fetchCateringProductRows,
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
  category: string;
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

export function mapCateringPackRow(row: CateringProductRow): CateringPack {
  const imageUrls = normalizeMenuImageUrls(row.image_urls);
  const moreImages = parseMenuImageMore(row.image_urls);
  const img =
    pickMenuImageUrl(imageUrls, [1920, 1024, 512, 256]) ??
    row.image_url?.trim() ??
    null;

  return {
    id: Number(row.id),
    name: row.name,
    category: row.category?.trim() || FEATURED_CATERING_PACK_CATEGORY,
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
  const rows = await fetchCateringProductRows();
  return rows.map(mapCateringPackRow);
}

async function loadCateringItemById(id: number): Promise<CateringPack | null> {
  const row = await fetchCateringProductRowById(id);
  return row ? mapCateringPackRow(row) : null;
}

export const getCateringPacks = unstable_cache(
  loadCateringPacks,
  [CACHE_TAG, SERVER_CACHE_INSTANCE_ID],
  {
    revalidate: SHORT_REVALIDATE_SECONDS,
    tags: [CACHE_TAG],
  },
);

export function getCateringItemById(id: number): Promise<CateringPack | null> {
  return unstable_cache(
    () => loadCateringItemById(id),
    [CACHE_TAG, "catering-item", SERVER_CACHE_INSTANCE_ID, "id", String(id)],
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
