"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
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

// ─── Context shape ────────────────────────────────────────────────────────────
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

function generateLineId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const addToCart = useCallback(
    (item: MenuItem, customisation?: ItemCustomisation, qty = 1, silent = false) => {
      if (!item.isAvailable) return;
      setCart(prev => [
        ...prev,
        { cartLineId: generateLineId(), item, qty, customisation },
      ]);
      if (!silent) toast.success(`${item.name} added to cart`);
    },
    []
  );

  const removeFromCart = useCallback((cartLineId: string) => {
    setCart(prev => prev.filter(c => c.cartLineId !== cartLineId));
  }, []);

  const updateQty = useCallback((cartLineId: string, delta: number) => {
    setCart(prev =>
      prev.map(c =>
        c.cartLineId === cartLineId
          ? { ...c, qty: Math.max(1, c.qty + delta) }
          : c
      )
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartTotal = cart.reduce((s, c) => {
    const extra = c.customisation?.extraPrice ?? 0;
    return s + (parseFloat(c.item.price) + extra) * c.qty;
  }, 0);

  return (
    <CartContext.Provider value={{ cart, cartCount, cartTotal, cartOpen, setCartOpen, addToCart, removeFromCart, updateQty, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
