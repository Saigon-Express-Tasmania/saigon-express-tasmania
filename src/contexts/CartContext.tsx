"use client";

import React, { createContext, useCallback, useContext } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";
import type { ItemCustomisation } from "@/components/ItemCustomiseModal";

// ─── Shared MenuItem type ─────────────────────────────────────────────────────
export type MenuItem = {
  id: number;
  name: string;
  category: string;
  price: string;
  description?: string | null;
  isAvailable: boolean | number;
  imageUrl?: string | null;
  sortOrder?: number | null;
  isPopular?: boolean | number | null;
};

export type CartItem = {
  cartLineId: string;
  item: MenuItem;
  qty: number;
  customisation?: ItemCustomisation;
};

// ─── Zustand store ────────────────────────────────────────────────────────────
type CartStore = {
  cart: CartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (item: MenuItem, customisation?: ItemCustomisation, qty?: number, silent?: boolean) => void;
  removeFromCart: (cartLineId: string) => void;
  updateQty: (cartLineId: string, delta: number) => void;
  clearCart: () => void;
};

function generateLineId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      cart: [],
      cartOpen: false,
      setCartOpen: (open) => set({ cartOpen: open }),
      addToCart: (item, customisation, qty = 1, silent = false) => {
        if (!item.isAvailable) return;
        set((state) => ({
          cart: [...state.cart, { cartLineId: generateLineId(), item, qty, customisation }],
        }));
        if (!silent) toast.success(`${item.name} added to cart`);
      },
      removeFromCart: (cartLineId) =>
        set((state) => ({ cart: state.cart.filter((c) => c.cartLineId !== cartLineId) })),
      updateQty: (cartLineId, delta) =>
        set((state) => ({
          cart: state.cart.map((c) =>
            c.cartLineId === cartLineId ? { ...c, qty: Math.max(1, c.qty + delta) } : c
          ),
        })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: "saigon-cart",
      storage: createJSONStorage(() => localStorage),
      // Only persist the cart items, not the open/close UI state
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);

// ─── Context shape (kept for backward compatibility) ──────────────────────────
type CartContextValue = {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (item: MenuItem, customisation?: ItemCustomisation, qty?: number, silent?: boolean) => void;
  removeFromCart: (cartLineId: string) => void;
  updateQty: (cartLineId: string, delta: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { cart, cartOpen, setCartOpen, addToCart, removeFromCart, updateQty, clearCart } =
    useCartStore();

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartTotal = cart.reduce((s, c) => {
    const extra = c.customisation?.extraPrice ?? 0;
    return s + (parseFloat(c.item.price) + extra) * c.qty;
  }, 0);

  return (
    <CartContext.Provider
      value={{ cart, cartCount, cartTotal, cartOpen, setCartOpen, addToCart, removeFromCart, updateQty, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
