/** Row shape from `public.wholesale_products` (snake_case). */
export type WholesaleProductRow = {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  description: string | null;
  unit: string;
  unit_price: string;
  stock_qty: number;
  is_available: boolean;
  min_order_qty: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

/** Product used by the wholesale shop UI (camelCase). */
export type WholesaleProduct = {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  description: string | null;
  unit: string;
  unitPrice: string;
  stockQty: number;
  isAvailable: boolean;
  minOrderQty: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export function mapWholesaleProductRow(row: WholesaleProductRow): WholesaleProduct {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    description: row.description,
    unit: row.unit,
    unitPrice: row.unit_price,
    stockQty: row.stock_qty,
    isAvailable: row.is_available,
    minOrderQty: row.min_order_qty,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

