import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import {
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
  description: string;
  includes: string[];
  note: string | null;
  prices: CateringTierPrice[];
  tag: string;
  tagBg: string;
  img: string | null;
  sortOrder: number;
  isAvailable: boolean;
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

function resolvePackImage(
  imageUrl: string | null,
  imageUrls: Record<string, unknown> | null,
): string | null {
  if (imageUrls && typeof imageUrls === "object" && !Array.isArray(imageUrls)) {
    for (const size of [1920, 1024, 512, 256]) {
      const url = String(imageUrls[String(size)] ?? "").trim();
      if (url) return url;
    }
    for (const [key, value] of Object.entries(imageUrls)) {
      if (key === "more") continue;
      const url = String(value ?? "").trim();
      if (url) return url;
    }
  }
  const legacy = imageUrl?.trim();
  return legacy || null;
}

function mapCateringPackRow(row: CateringProductRow): CateringPack {
  return {
    id: Number(row.id),
    name: row.name,
    category: row.category?.trim() || FEATURED_CATERING_PACK_CATEGORY,
    serves: row.serves?.trim() || null,
    price: row.price?.trim() || null,
    description: row.description ?? "",
    includes: Array.isArray(row.includes)
      ? row.includes.map((value) => String(value))
      : [],
    note: row.note?.trim() || null,
    prices: mapTierPrices(row.prices),
    tag: row.tag ?? "",
    tagBg: row.tag_bg ?? "",
    img: resolvePackImage(row.image_url, row.image_urls),
    sortOrder: Number(row.sort_order ?? 0),
    isAvailable: Boolean(row.is_available),
  };
}

async function loadCateringPacks(): Promise<CateringPack[]> {
  const rows = await fetchCateringProductRows();
  return rows.map(mapCateringPackRow);
}

export const getCateringPacks = unstable_cache(loadCateringPacks, [CACHE_TAG], {
  revalidate: SHORT_REVALIDATE_SECONDS,
  tags: [CACHE_TAG],
});
