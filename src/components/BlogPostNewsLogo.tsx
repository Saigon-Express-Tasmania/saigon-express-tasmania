"use client";

import { useSiteSetting } from "@/contexts/SiteContentContext";
import { resolvePublicAssetUrl } from "@/lib/resolve-site-url";

type BlogPostNewsLogoProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
};

export default function BlogPostNewsLogo({
  src,
  alt,
  className = "h-5 w-auto object-contain",
}: BlogPostNewsLogoProps) {
  const siteUrl = useSiteSetting("site_url");
  const resolved = resolvePublicAssetUrl(src, siteUrl);
  if (!resolved) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolved} alt={alt} className={className} />
  );
}
