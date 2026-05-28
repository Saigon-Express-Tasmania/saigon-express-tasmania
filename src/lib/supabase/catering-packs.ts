import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { createServerSupabaseClient } from "./server";

const CACHE_TAG = CACHE_TAGS.cateringPacks;

export type CateringPack = {
  id: number;
  name: string;
  serves: string;
  price: string;
  description: string;
  includes: string[];
  tag: string;
  tagBg: string;
  img: string | null;
  sortOrder: number;
  isAvailable: boolean;
};

type CateringPackRow = {
  id: number;
  name: string;
  serves: string;
  price: string;
  description: string;
  includes: string[] | null;
  tag: string;
  tag_bg: string;
  image_url: string | null;
  sort_order: number;
  is_available: boolean;
};

function mapCateringPackRow(row: CateringPackRow): CateringPack {
  return {
    id: Number(row.id),
    name: row.name,
    serves: row.serves,
    price: row.price,
    description: row.description,
    includes: Array.isArray(row.includes)
      ? row.includes.map((value) => String(value))
      : [],
    tag: row.tag,
    tagBg: row.tag_bg,
    img: row.image_url,
    sortOrder: Number(row.sort_order ?? 0),
    isAvailable: Boolean(row.is_available),
  };
}

async function loadCateringPacks(): Promise<CateringPack[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("catering_packs")
    .select(
      "id, name, serves, price, description, includes, tag, tag_bg, image_url, sort_order, is_available",
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
