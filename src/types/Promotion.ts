/** Row shape from `public.promotions` (snake_case). */
export type PromotionRow = {
  id: number;
  title: string;
  description: string | null;
  badge: string | null;
  discount_label: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_href: string | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** Promotion used by UI components (camelCase). */
export type Promotion = {
  id: number;
  title: string;
  description: string | null;
  badge: string | null;
  discountLabel: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export function mapPromotionRow(row: PromotionRow): Promotion {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    badge: row.badge,
    discountLabel: row.discount_label,
    imageUrl: row.image_url,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

