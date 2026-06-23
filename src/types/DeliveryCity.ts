/** Row shape from `public.delivery_cities` (snake_case). */
export type DeliveryCityRow = {
  id: number;
  name: string;
  postal_code: number;
  my_distance: number | null;
};

/** Delivery suburb used by UI components (camelCase). */
export type DeliveryCity = {
  id: number;
  name: string;
  postalCode: number;
  distanceKm: number | null;
};

export function mapDeliveryCityRow(row: DeliveryCityRow): DeliveryCity {
  return {
    id: row.id,
    name: row.name,
    postalCode: row.postal_code,
    distanceKm:
      row.my_distance == null
        ? null
        : Number.parseFloat(String(row.my_distance)),
  };
}
