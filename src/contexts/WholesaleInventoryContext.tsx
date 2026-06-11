"use client";

import { wholesaleInventoryLimitMessage } from "@/lib/wholesale-inventory";
import type { WholesaleProductAvailabilityRow } from "@/types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type InventoryMap = Record<number, WholesaleProductAvailabilityRow>;

type WholesaleInventoryContextValue = {
  isLoaded: boolean;
  setInventory: (rows: WholesaleProductAvailabilityRow[]) => void;
  getAvailability: (productId: number) => WholesaleProductAvailabilityRow | undefined;
  getMaxQty: (productId: number) => number;
  validateQty: (
    productId: number,
    qty: number,
    itemName: string,
  ) => { ok: true } | { ok: false; message: string };
};

const WholesaleInventoryContext =
  createContext<WholesaleInventoryContextValue | null>(null);

export function WholesaleInventoryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [inventory, setInventoryState] = useState<InventoryMap>({});
  const isLoaded = Object.keys(inventory).length > 0;

  const setInventory = useCallback((rows: WholesaleProductAvailabilityRow[]) => {
    setInventoryState(
      Object.fromEntries(rows.map((row) => [row.product_id, row])),
    );
  }, []);

  const getAvailability = useCallback(
    (productId: number) => inventory[productId],
    [inventory],
  );

  const getMaxQty = useCallback(
    (productId: number) => {
      const row = inventory[productId];
      if (!row) return Number.POSITIVE_INFINITY;
      return Math.max(row.effective_remaining, 0);
    },
    [inventory],
  );

  const validateQty = useCallback(
    (productId: number, qty: number, itemName: string) => {
      const row = inventory[productId];
      if (!row) {
        return {
          ok: false as const,
          message: `${itemName} is not available for wholesale today.`,
        };
      }

      if (qty > row.effective_remaining) {
        return {
          ok: false as const,
          message: wholesaleInventoryLimitMessage(itemName, qty, row),
        };
      }

      return { ok: true as const };
    },
    [inventory],
  );

  const value = useMemo(
    () => ({
      isLoaded,
      setInventory,
      getAvailability,
      getMaxQty,
      validateQty,
    }),
    [isLoaded, setInventory, getAvailability, getMaxQty, validateQty],
  );

  return (
    <WholesaleInventoryContext.Provider value={value}>
      {children}
    </WholesaleInventoryContext.Provider>
  );
}

export function useWholesaleInventory() {
  const context = useContext(WholesaleInventoryContext);
  if (!context) {
    throw new Error(
      "useWholesaleInventory must be used inside WholesaleInventoryProvider",
    );
  }
  return context;
}
