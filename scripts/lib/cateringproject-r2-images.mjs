/**
 * Catering Project image path helpers for Cloudflare R2.
 *
 * Object keys:
 *   products/catering-packs/<product-slug>/<filename>
 *
 * Legacy Supabase keys (still recognized for migration):
 *   catering-packs/<product-slug>/<filename>
 */

import {
  BUCKET as SUPABASE_BUCKET,
  FOLDER as LEGACY_FOLDER,
  isSupabasePublicUrl,
  parseSupabaseObjectPath,
} from "./cateringproject-supabase-images.mjs";
import { buildR2PublicUrl, normalizeObjectKey } from "./r2-client.mjs";

export const FOLDER = "products/catering-packs";
export { LEGACY_FOLDER, SUPABASE_BUCKET };

export function buildPublicUrl(r2PublicUrl, objectPath) {
  return buildR2PublicUrl(r2PublicUrl, objectPath);
}

export function isR2PublicUrl(value, r2PublicUrl) {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return false;
  const base = String(r2PublicUrl ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!base) return false;
  return value.startsWith(`${base}/`);
}

export function parseR2ObjectPath(value, r2PublicUrl) {
  if (!isR2PublicUrl(value, r2PublicUrl)) return null;

  const base = String(r2PublicUrl).trim().replace(/\/+$/, "");
  const objectPath = normalizeObjectKey(
    value.slice(base.length).split("?")[0] ?? "",
  );
  if (!objectPath.startsWith(`${FOLDER}/`)) return null;

  const match = objectPath.match(
    /^products\/catering-packs\/([^/]+)\/(.+)$/,
  );
  if (!match) return null;

  return {
    objectPath,
    productSlug: match[1],
    fileName: match[2],
  };
}

/** Parse either an R2 products/catering-packs URL or a legacy Supabase catering-packs URL. */
export function parseCateringPackObjectPath(value, r2PublicUrl) {
  const fromR2 = parseR2ObjectPath(value, r2PublicUrl);
  if (fromR2) return { ...fromR2, source: "r2" };

  const fromSupabase = parseSupabaseObjectPath(value);
  if (fromSupabase) {
    return {
      objectPath: `${FOLDER}/${fromSupabase.productSlug}/${fromSupabase.fileName}`,
      productSlug: fromSupabase.productSlug,
      fileName: fromSupabase.fileName,
      legacyObjectPath: fromSupabase.objectPath,
      source: "supabase",
    };
  }

  return null;
}

export function isLegacySupabaseCateringUrl(value) {
  return isSupabasePublicUrl(value) && Boolean(parseSupabaseObjectPath(value));
}

export function categoryLocalImagePath(productSlug, fileName) {
  return `images/${productSlug}/${fileName}`;
}

export function prefixedLocalImagePath(categorySlug, productSlug, fileName) {
  return `${categorySlug}/images/${productSlug}/${fileName}`;
}
