"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { toast } from "sonner";

export type CateringCartItem = {
  lineKey: string;
  productId: number;
  productName: string;
  variantLabel: string | null;
  qty: number;
  unitPrice: number;
  imageUrl: string | null;
  addedAt: number;
};

export type CateringCartProductInput = {
  productId: number;
  productName: string;
  variantLabel?: string | null;
  unitPrice: number;
  imageUrl?: string | null;
};

function buildLineKey(productId: number, variantLabel?: string | null): string {
  const variant = variantLabel?.trim();
  return variant ? `${productId}:${variant}` : String(productId);
}

type CateringCartStore = {
  cart: CateringCartItem[];
  cartOpen: boolean;
  highlightLineKey: string | null;
  setCartOpen: (open: boolean) => void;
  clearCartHighlight: () => void;
  addToCart: (
    product: CateringCartProductInput,
    options?: { silent?: boolean },
  ) => void;
  updateQty: (lineKey: string, delta: number) => void;
  setCartQty: (lineKey: string, qty: number) => void;
  removeFromCart: (lineKey: string) => void;
  clearCart: () => void;
};

const useCateringCartStore = create<CateringCartStore>()(
  persist(
    (set) => ({
      cart: [],
      cartOpen: false,
      highlightLineKey: null,
      setCartOpen: (open) =>
        set({
          cartOpen: open,
          highlightLineKey: null,
        }),
      clearCartHighlight: () => set({ highlightLineKey: null }),
      addToCart: (product, options) => {
        set((state) => {
          const lineKey = buildLineKey(product.productId, product.variantLabel);
          const now = Date.now();
          const existing = state.cart.find((item) => item.lineKey === lineKey);
          const nextCart = existing
            ? state.cart.map((item) =>
                item.lineKey === lineKey
                  ? {
                      ...item,
                      qty: item.qty + 1,
                      addedAt: now,
                      imageUrl: product.imageUrl ?? item.imageUrl,
                    }
                  : item,
              )
            : [
                ...state.cart,
                {
                  lineKey,
                  productId: product.productId,
                  productName: product.productName,
                  variantLabel: product.variantLabel?.trim() || null,
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
                  highlightLineKey: lineKey,
                }),
          };
        });
        if (!options?.silent) {
          toast.success(`${product.productName} added to cart`);
        }
      },
      updateQty: (lineKey, delta) =>
        set((state) => {
          const existing = state.cart.find((item) => item.lineKey === lineKey);
          const newQty = Math.max(0, (existing?.qty ?? 0) + delta);
          if (newQty === 0) {
            return {
              cart: state.cart.filter((item) => item.lineKey !== lineKey),
            };
          }
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.lineKey === lineKey ? { ...item, qty: newQty } : item,
              ),
            };
          }
          return state;
        }),
      setCartQty: (lineKey, qty) =>
        set((state) => {
          const nextQty = Math.max(0, Math.floor(qty));
          if (nextQty === 0) {
            return {
              cart: state.cart.filter((item) => item.lineKey !== lineKey),
            };
          }
          const existing = state.cart.find((item) => item.lineKey === lineKey);
          if (!existing) return state;
          return {
            cart: state.cart.map((item) =>
              item.lineKey === lineKey ? { ...item, qty: nextQty } : item,
            ),
          };
        }),
      removeFromCart: (lineKey) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.lineKey !== lineKey),
        })),
      clearCart: () => set({ cart: [], highlightLineKey: null }),
    }),
    {
      name: "saigon-catering-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ cart: state.cart }),
    },
  ),
);

type CateringCartContextValue = {
  cart: CateringCartItem[];
  cartCount: number;
  cartTotal: number;
  cartOpen: boolean;
  highlightLineKey: string | null;
  isHydrated: boolean;
  setCartOpen: (open: boolean) => void;
  clearCartHighlight: () => void;
  addToCart: (
    product: CateringCartProductInput,
    options?: { silent?: boolean },
  ) => void;
  updateQty: (lineKey: string, delta: number) => void;
  setCartQty: (lineKey: string, qty: number) => void;
  removeFromCart: (lineKey: string) => void;
  clearCart: () => void;
  getCartQty: (productId: number, variantLabel?: string | null) => number;
};

const CateringCartContext = createContext<CateringCartContextValue | null>(null);

export function CateringCartProvider({ children }: { children: React.ReactNode }) {
  const store = useCateringCartStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const cartCount = store.cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = store.cart.reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0,
  );

  const getCartQty = (productId: number, variantLabel?: string | null) => {
    const lineKey = buildLineKey(productId, variantLabel);
    return store.cart.find((item) => item.lineKey === lineKey)?.qty ?? 0;
  };

  return (
    <CateringCartContext.Provider
      value={{
        cart: store.cart,
        cartCount,
        cartTotal,
        cartOpen: store.cartOpen,
        highlightLineKey: store.highlightLineKey,
        isHydrated,
        setCartOpen: store.setCartOpen,
        clearCartHighlight: store.clearCartHighlight,
        addToCart: store.addToCart,
        updateQty: store.updateQty,
        setCartQty: store.setCartQty,
        removeFromCart: store.removeFromCart,
        clearCart: store.clearCart,
        getCartQty,
      }}
    >
      {children}
    </CateringCartContext.Provider>
  );
}

export function useCateringCart(): CateringCartContextValue {
  const context = useContext(CateringCartContext);
  if (!context) {
    throw new Error("useCateringCart must be used within CateringCartProvider");
  }
  return context;
}
