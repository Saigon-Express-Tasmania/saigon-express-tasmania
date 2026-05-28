import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { createServerSupabaseClient } from "./server";

const CACHE_TAG = CACHE_TAGS.cateringBoxes;

export type CateringBoxTierPrice = {
  size: string;
  price: string;
  serves: string;
};

export type CateringBox = {
  id: number;
  category: string;
  name: string;
  price: string | null;
  serves: string | null;
  includes: string[];
  note: string | null;
  prices: CateringBoxTierPrice[];
  img: string | null;
  sortOrder: number;
  isAvailable: boolean;
};

type CateringBoxRow = {
  id: number;
  category: string;
  name: string;
  price: string | null;
  serves: string | null;
  includes: string[] | null;
  note: string | null;
  prices: CateringBoxTierPrice[] | null;
  image_url: string | null;
  sort_order: number;
  is_available: boolean;
};

function mapTierPrices(input: CateringBoxRow["prices"]): CateringBoxTierPrice[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => ({
      size: String(item?.size ?? ""),
      price: String(item?.price ?? ""),
      serves: String(item?.serves ?? ""),
    }))
    .filter((item) => item.size && item.price && item.serves);
}

function mapCateringBoxRow(row: CateringBoxRow): CateringBox {
  return {
    id: Number(row.id),
    category: row.category,
    name: row.name,
    price: row.price,
    serves: row.serves,
    includes: Array.isArray(row.includes)
      ? row.includes.map((value) => String(value))
      : [],
    note: row.note,
    prices: mapTierPrices(row.prices),
    img: row.image_url,
    sortOrder: Number(row.sort_order ?? 0),
    isAvailable: Boolean(row.is_available),
  };
}

async function loadCateringBoxes(): Promise<CateringBox[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("catering_boxes")
    .select(
      "id, category, name, price, serves, includes, note, prices, image_url, sort_order, is_available",
    )
    .eq("is_available", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`catering_boxes: ${error.message}`);
  }

  return (data ?? []).map((row) => mapCateringBoxRow(row as CateringBoxRow));
}

export const getCateringBoxes = unstable_cache(loadCateringBoxes, [CACHE_TAG], {
  revalidate: SHORT_REVALIDATE_SECONDS,
  tags: [CACHE_TAG],
});
