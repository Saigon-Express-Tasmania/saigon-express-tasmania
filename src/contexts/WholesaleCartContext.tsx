"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { toast } from "sonner";

export type WholesaleCartItem = {
  productId: number;
  productName: string;
  qty: number;
  unitPrice: number;
};

export type WholesaleCartProductInput = {
  productId: number;
  productName: string;
  unitPrice: number;
};

type WholesaleCartStore = {
  cart: WholesaleCartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (
    product: WholesaleCartProductInput,
    options?: { silent?: boolean },
  ) => void;
  updateQty: (productId: number, delta: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
};

const useWholesaleCartStore = create<WholesaleCartStore>()(
  persist(
    (set) => ({
      cart: [],
      cartOpen: false,
      setCartOpen: (open) => set({ cartOpen: open }),
      addToCart: (product, options) => {
        set((state) => {
          const existing = state.cart.find(
            (item) => item.productId === product.productId,
          );
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.productId === product.productId
                  ? { ...item, qty: item.qty + 1 }
                  : item,
              ),
            };
          }
          return {
            cart: [
              ...state.cart,
              {
                productId: product.productId,
                productName: product.productName,
                qty: 1,
                unitPrice: product.unitPrice,
              },
            ],
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
      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.productId !== productId),
        })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: "saigon-wholesale-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ cart: state.cart }),
    },
  ),
);

type WholesaleCartContextValue = {
  cart: WholesaleCartItem[];
  cartCount: number;
  cartTotal: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (
    product: WholesaleCartProductInput,
    options?: { silent?: boolean },
  ) => void;
  updateQty: (productId: number, delta: number) => void;
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
  const [isHydrated, setIsHydrated] = useState(
    () => useWholesaleCartStore.persist.hasHydrated(),
  );

  useEffect(() => {
    const unsub = useWholesaleCartStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });
    setIsHydrated(useWholesaleCartStore.persist.hasHydrated());
    return unsub;
  }, []);

  const {
    cart,
    cartOpen,
    setCartOpen,
    addToCart,
    updateQty,
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
        cartOpen,
        setCartOpen,
        addToCart,
        updateQty,
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
