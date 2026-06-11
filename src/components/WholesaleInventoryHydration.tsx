"use client";

import { useWholesaleInventory } from "@/contexts/WholesaleInventoryContext";
import type { WholesaleProductAvailabilityRow } from "@/types";
import { useLayoutEffect } from "react";

export default function WholesaleInventoryHydration({
  inventory,
}: {
  inventory: WholesaleProductAvailabilityRow[];
}) {
  const { setInventory } = useWholesaleInventory();

  useLayoutEffect(() => {
    if (inventory.length > 0) {
      setInventory(inventory);
    }
  }, [inventory, setInventory]);

  return null;
}
