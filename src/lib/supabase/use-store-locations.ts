"use client";

import { useEffect, useState } from "react";
import type { StoreLocation } from "@/types";
import { mapStoreLocationRow } from "@/types";
import { supabase } from "@/lib/supabase/client";

export function useStoreLocations() {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: queryError } = await supabase
          .from("store_locations")
          .select(
            "id, sort_order, name, address, suburb, lat, lng, phone, email, hours, is_active, is_invoice_creator, is_shipping, delivery_url, google_map_url",
          )
          .eq("is_active", true)
          .order("id", { ascending: true });

        if (queryError) throw queryError;
        if (!cancelled) {
          setStores((data ?? []).map((row) => mapStoreLocationRow(row)));
        }
      } catch (err) {
        if (!cancelled) {
          setStores([]);
          setError(err instanceof Error ? err.message : "Failed to load stores.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stores, loading, error };
}
