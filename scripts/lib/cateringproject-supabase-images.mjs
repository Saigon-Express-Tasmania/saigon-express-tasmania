export const BUCKET = "saigon-express-tasmania";
export const FOLDER = "catering-packs";

export function isSupabasePublicUrl(value) {
  return (
    typeof value === "string" &&
    /^https?:\/\//i.test(value) &&
    value.includes("/storage/v1/object/public/")
  );
}

export function buildPublicUrl(supabaseUrl, objectPath) {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

export function parseSupabaseObjectPath(value) {
  if (!isSupabasePublicUrl(value)) return null;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = value.indexOf(marker);
  if (index === -1) return null;

  const objectPath = value.slice(index + marker.length);
  if (!objectPath.startsWith(`${FOLDER}/`)) return null;

  const match = objectPath.match(/^catering-packs\/([^/]+)\/(.+)$/);
  if (!match) return null;

  return {
    objectPath,
    productSlug: match[1],
    fileName: match[2],
  };
}

export function categoryLocalImagePath(productSlug, fileName) {
  return `images/${productSlug}/${fileName}`;
}

export function prefixedLocalImagePath(categorySlug, productSlug, fileName) {
  return `${categorySlug}/images/${productSlug}/${fileName}`;
}
