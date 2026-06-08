import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { createServerSupabaseClient } from "./server";

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

type CateringPackRow = {
  id: number;
  name: string;
  category: string;
  serves: string | null;
  price: string | null;
  description: string;
  includes: string[] | null;
  note: string | null;
  prices: CateringTierPrice[] | null;
  tag: string;
  tag_bg: string;
  image_url: string | null;
  image_urls: Record<string, unknown> | null;
  sort_order: number;
  is_available: boolean;
};

function mapTierPrices(input: CateringPackRow["prices"]): CateringTierPrice[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => ({
      size: String(item?.size ?? ""),
      price: String(item?.price ?? ""),
      serves: String(item?.serves ?? ""),
    }))
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

function mapCateringPackRow(row: CateringPackRow): CateringPack {
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
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("catering_packs")
    .select(
      "id, name, category, serves, price, description, includes, note, prices, tag, tag_bg, image_url, image_urls, sort_order, is_available",
    )
    .eq("is_available", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`catering_packs: ${error.message}`);
  }

  return (data ?? []).map((row) => mapCateringPackRow(row as CateringPackRow));
}

export const getCateringPacks = unstable_cache(loadCateringPacks, [CACHE_TAG], {
  revalidate: SHORT_REVALIDATE_SECONDS,
  tags: [CACHE_TAG],
});
