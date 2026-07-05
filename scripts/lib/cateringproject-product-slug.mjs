export function inferProductSlug(product) {
  const urls = product.image_urls ?? {};

  for (const key of ["256", "512", "1024", "1920"]) {
    const slug = slugFromImagePath(urls[key]);
    if (slug) return slug;
  }

  const fromImageUrl = slugFromImagePath(product.image_url);
  if (fromImageUrl) return fromImageUrl;

  if (Array.isArray(urls.more)) {
    for (const entry of urls.more) {
      const slug = slugFromImagePath(entry.sm) ?? slugFromImagePath(entry.lg);
      if (slug) return slug;
    }
  }

  if (typeof product.sku === "string" && product.sku.startsWith("CP-")) {
    return product.sku.slice(3).toLowerCase().replace(/_/g, "-");
  }

  return slugFromName(product.name);
}

export function slugFromImagePath(value) {
  if (typeof value !== "string" || !value) return null;

  const prefixedLocalMatch = value.match(/^[^/]+\/images\/([^/]+)\//);
  if (prefixedLocalMatch) return prefixedLocalMatch[1];

  const localMatch = value.match(/^images\/([^/]+)\//);
  if (localMatch) return localMatch[1];

  const remoteMatch = value.match(/\/catering-packs\/([^/]+)\//);
  if (remoteMatch) return remoteMatch[1];

  return null;
}

export function slugFromName(name) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isRemoteImageUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

export function isPrefixedLocalImagePath(value) {
  return typeof value === "string" && /^[^/]+\/images\//.test(value);
}

export function prefixLocalImagePath(value, categorySlug) {
  if (!value || typeof value !== "string") return value;
  if (isRemoteImageUrl(value)) return value;
  if (isPrefixedLocalImagePath(value)) return value;
  if (value.startsWith("images/")) return `${categorySlug}/${value}`;
  return value;
}

export function prefixProductImagePaths(product, categorySlug) {
  const next = structuredClone(product);
  const imageUrls = next.image_urls ?? {};

  for (const [key, value] of Object.entries(imageUrls)) {
    if (key === "more" || typeof value !== "string") continue;
    imageUrls[key] = prefixLocalImagePath(value, categorySlug);
  }

  if (Array.isArray(imageUrls.more)) {
    imageUrls.more = imageUrls.more.map((entry) => ({
      sm: prefixLocalImagePath(entry.sm, categorySlug),
      lg: prefixLocalImagePath(entry.lg, categorySlug),
    }));
  }

  next.image_urls = imageUrls;
  next.image_url = prefixLocalImagePath(next.image_url, categorySlug);
  return next;
}

export function scoreProductImages(product) {
  let score = 0;
  const imageUrls = product.image_urls ?? {};

  if (isRemoteImageUrl(product.image_url)) score += 1000;

  for (const key of ["256", "512", "1024", "1920"]) {
    const value = imageUrls[key];
    if (!value) continue;
    score += 10;
    if (isRemoteImageUrl(value)) score += 100;
  }

  if (Array.isArray(imageUrls.more)) {
    score += imageUrls.more.length * 5;
    for (const entry of imageUrls.more) {
      if (isRemoteImageUrl(entry.sm)) score += 2;
      if (isRemoteImageUrl(entry.lg)) score += 2;
    }
  }

  return score;
}
