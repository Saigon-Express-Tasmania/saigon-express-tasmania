import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { sortDeliveryCities } from "@/lib/delivery-cities";
import type { DeliveryCity } from "@/types";
import { mapDeliveryCityRow } from "@/types";
import { SERVER_CACHE_INSTANCE_ID } from "./cache-instance";
import { fetchDeliveryCityRows } from "./server";

const CACHE_TAG = CACHE_TAGS.deliveryCities;

async function loadDeliveryCities(): Promise<DeliveryCity[]> {
  const rows = await fetchDeliveryCityRows();
  return sortDeliveryCities(rows.map(mapDeliveryCityRow));
}

/** Tasmania delivery suburbs for order review city/postal selection. */
export const getDeliveryCities = unstable_cache(
  loadDeliveryCities,
  [CACHE_TAG, SERVER_CACHE_INSTANCE_ID],
  {
    revalidate: SHORT_REVALIDATE_SECONDS,
    tags: [CACHE_TAG],
  },
);
