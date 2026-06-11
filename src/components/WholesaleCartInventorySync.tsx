"use client";

import { useWholesaleCart } from "@/contexts/WholesaleCartContext";
import { useWholesaleInventory } from "@/contexts/WholesaleInventoryContext";
import { supabase, useSupabase } from "@/hooks/useSupabase";
import { useEffect } from "react";
import { toast } from "sonner";
import type { WholesaleProductAvailabilityRow } from "@/types";

function WholesaleCartInventorySync() {
  const { isLoaded, getMaxQty, setInventory } = useWholesaleInventory();
  const { cart, setCartQty, removeFromCart, isHydrated } = useWholesaleCart();
  const { profile } = useSupabase();

  useEffect(() => {
    if (isLoaded || !isHydrated || cart.length === 0) return;

    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase.rpc(
        "get_wholesale_products_availability",
        { p_customer_account: profile?.id ?? null },
      );

      if (cancelled || error || !data) return;

      setInventory(data as WholesaleProductAvailabilityRow[]);
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isHydrated, cart.length, profile?.id, setInventory]);

  useEffect(() => {
    if (!isLoaded || !isHydrated || cart.length === 0) return;

    for (const item of cart) {
      const maxQty = getMaxQty(item.productId);
      if (!Number.isFinite(maxQty)) continue;

      if (maxQty <= 0) {
        removeFromCart(item.productId);
        toast.error(`${item.productName} is no longer available today.`);
        continue;
      }

      if (item.qty > maxQty) {
        setCartQty(item.productId, maxQty);
        toast.error(
          `${item.productName} was reduced to ${maxQty} (today's limit).`,
        );
      }
    }
  }, [
    isLoaded,
    isHydrated,
    cart,
    getMaxQty,
    setCartQty,
    removeFromCart,
  ]);

  return null;
}

export default WholesaleCartInventorySync;
