"use client";

import { useWholesaleCart } from "@/contexts/WholesaleCartContext";
import {
  ChevronRight,
  CreditCard,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export default function WholesaleShoppingCart() {
  const {
    cart,
    cartTotal,
    cartOpen,
    setCartOpen,
    updateQty,
    clearCart,
  } = useWholesaleCart();

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
  };

  if (!cartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Close cart"
        className="flex-1 bg-black/60 backdrop-blur-sm"
        onClick={() => setCartOpen(false)}
      />
      <div className="w-full sm:max-w-md bg-black border-l border-white/10 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" /> Your Cart
          </h2>
          <div className="flex items-center gap-3">
            {cart.length > 0 ? (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-white/30 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setCartOpen(false)}
              className="text-white/40 hover:text-white transition-colors text-2xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Your cart is empty</p>
              <p className="text-xs mt-1">Add products to get started</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-snug">
                    {item.productName}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    ${Number(item.unitPrice).toFixed(2)} ex GST
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => updateQty(item.productId, -1)}
                      className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold text-white w-6 text-center">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.productId, 1)}
                      className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-white">
                    ${(Number(item.unitPrice) * item.qty).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, -item.qty)}
                    className="mt-2 text-white/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 ? (
          <div className="px-6 py-5 border-t border-white/10 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Subtotal (ex GST)</span>
              <span className="font-bold text-white">
                ${cartTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">GST (10%)</span>
              <span className="font-bold text-white">
                ${(cartTotal * 0.1).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-white/10 pt-3">
              <span className="text-white">Total (inc GST)</span>
              <span className="text-primary">
                ${(cartTotal * 1.1).toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              <CreditCard className="w-4 h-4" />
              Checkout with Card / Apple Pay
              <ChevronRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-white/30 text-center">
              Secure payment via Stripe · Card & Apple Pay accepted
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
