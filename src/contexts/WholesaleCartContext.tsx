"use client";

import { DEFAULT_MINIMUM_WHOLESALE_ORDER_VALUE } from "@/config";
import { createContext, useContext, useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { toast } from "sonner";

export type WholesaleCartItem = {
  productId: number;
  productName: string;
  qty: number;
  unitPrice: number;
  imageUrl?: string | null;
  /** Unix ms when this line was last added from the shop. */
  addedAt: number;
};

export type WholesaleCartProductInput = {
  productId: number;
  productName: string;
  unitPrice: number;
  imageUrl?: string | null;
};

type WholesaleCartStore = {
  cart: WholesaleCartItem[];
  cartOpen: boolean;
  highlightProductId: number | null;
  setCartOpen: (open: boolean) => void;
  clearCartHighlight: () => void;
  addToCart: (
    product: WholesaleCartProductInput,
    options?: { silent?: boolean },
  ) => void;
  updateQty: (productId: number, delta: number) => void;
  setCartQty: (productId: number, qty: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
};

function normalizeCartItem(
  item: WholesaleCartItem & { addedAt?: number },
): WholesaleCartItem {
  return {
    ...item,
    imageUrl: item.imageUrl ?? null,
    addedAt: item.addedAt ?? 0,
  };
}

const useWholesaleCartStore = create<WholesaleCartStore>()(
  persist(
    (set) => ({
      cart: [],
      cartOpen: false,
      highlightProductId: null,
      setCartOpen: (open) =>
        set({
          cartOpen: open,
          highlightProductId: null,
        }),
      clearCartHighlight: () => set({ highlightProductId: null }),
      addToCart: (product, options) => {
        set((state) => {
          const now = Date.now();
          const existing = state.cart.find(
            (item) => item.productId === product.productId,
          );
          const nextCart = existing
            ? state.cart.map((item) =>
                item.productId === product.productId
                  ? {
                      ...item,
                      qty: item.qty + 1,
                      addedAt: now,
                      imageUrl: product.imageUrl ?? item.imageUrl ?? null,
                    }
                  : item,
              )
            : [
                ...state.cart,
                {
                  productId: product.productId,
                  productName: product.productName,
                  qty: 1,
                  unitPrice: product.unitPrice,
                  imageUrl: product.imageUrl ?? null,
                  addedAt: now,
                },
              ];

          return {
            cart: nextCart,
            ...(options?.silent
              ? {}
              : {
                  cartOpen: true,
                  highlightProductId: product.productId,
                }),
          };
        });
        if (!options?.silent) {
          toast.success(`${product.productName} added to cart`);
        }
      },
      updateQty: (productId, delta) =>
        set((state) => {
          const existing = state.cart.find((item) => item.productId === productId);
          const newQty = Math.max(0, (existing?.qty ?? 0) + delta);
          if (newQty === 0) {
            return {
              cart: state.cart.filter((item) => item.productId !== productId),
            };
          }
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.productId === productId ? { ...item, qty: newQty } : item,
              ),
            };
          }
          return state;
        }),
      setCartQty: (productId, qty) =>
        set((state) => {
          const nextQty = Math.max(0, Math.floor(qty));
          if (nextQty === 0) {
            return {
              cart: state.cart.filter((item) => item.productId !== productId),
            };
          }
          const existing = state.cart.find((item) => item.productId === productId);
          if (!existing) return state;
          return {
            cart: state.cart.map((item) =>
              item.productId === productId ? { ...item, qty: nextQty } : item,
            ),
          };
        }),
      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.productId !== productId),
        })),
      clearCart: () => set({ cart: [], highlightProductId: null }),
    }),
    {
      name: "saigon-wholesale-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ cart: state.cart }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<WholesaleCartStore> | undefined;
        return {
          ...current,
          ...persistedState,
          cart: (persistedState?.cart ?? []).map((item) =>
            normalizeCartItem(item as WholesaleCartItem & { addedAt?: number }),
          ),
        };
      },
    },
  ),
);

type WholesaleCartContextValue = {
  cart: WholesaleCartItem[];
  cartCount: number;
  cartTotal: number;
  minimumOrderValue: number;
  setMinimumOrderValue: (value: number) => void;
  cartOpen: boolean;
  highlightProductId: number | null;
  setCartOpen: (open: boolean) => void;
  clearCartHighlight: () => void;
  addToCart: (
    product: WholesaleCartProductInput,
    options?: { silent?: boolean },
  ) => void;
  updateQty: (productId: number, delta: number) => void;
  setCartQty: (productId: number, qty: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  getCartQty: (productId: number) => number;
  isHydrated: boolean;
};

const WholesaleCartContext = createContext<WholesaleCartContextValue | null>(
  null,
);

export function WholesaleCartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [minimumOrderValue, setMinimumOrderValue] = useState(
    DEFAULT_MINIMUM_WHOLESALE_ORDER_VALUE,
  );

  useEffect(() => {
    const { persist } = useWholesaleCartStore;
    if (!persist) {
      setIsHydrated(true);
      return;
    }

    setIsHydrated(persist.hasHydrated());
    return persist.onFinishHydration(() => {
      setIsHydrated(true);
    });
  }, []);

  const {
    cart,
    cartOpen,
    highlightProductId,
    setCartOpen,
    clearCartHighlight,
    addToCart,
    updateQty,
    setCartQty,
    removeFromCart,
    clearCart,
  } = useWholesaleCartStore();

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.qty,
    0,
  );

  const getCartQty = (productId: number) =>
    cart.find((item) => item.productId === productId)?.qty ?? 0;

  return (
    <WholesaleCartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        minimumOrderValue,
        setMinimumOrderValue,
        cartOpen,
        highlightProductId,
        setCartOpen,
        clearCartHighlight,
        addToCart,
        updateQty,
        setCartQty,
        removeFromCart,
        clearCart,
        getCartQty,
        isHydrated,
      }}
    >
      {children}
    </WholesaleCartContext.Provider>
  );
}

export function useWholesaleCart() {
  const context = useContext(WholesaleCartContext);
  if (!context) {
    throw new Error(
      "useWholesaleCart must be used inside WholesaleCartProvider",
    );
  }
  return context;
}
