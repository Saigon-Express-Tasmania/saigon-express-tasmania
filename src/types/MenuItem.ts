import type { MenuItem } from "@/contexts/CartContext";

/** Row shape from `public.menu` (snake_case). */
export type MenuItemRow = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  wholesale_price: string | null;
  category: string;
  image_url: string | null;
  is_available: boolean;
  is_popular: boolean;
  sort_order: number;
  ingredients: unknown;
};

export function mapMenuItemRow(row: MenuItemRow): MenuItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    description: row.description,
    isAvailable: row.is_available,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    isPopular: row.is_popular,
  };
}
