"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWholesaleCart } from "@/contexts/WholesaleCartContext";
import { useSupabase } from "@/hooks/useSupabase";
import { getClientStripeMode } from "@/lib/stripe-mode";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import { useLocale } from "next-intl";
import { DEFAULT_LOCALE } from "@/config/localize";
import type { UserProfile } from "@/types";
import {
  ChevronRight,
  CreditCard,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const CART_ANIMATION_DURATION = 0.24;

const backdropMotion = {
  initial: {
    opacity: 0,
    backdropFilter: "blur(0px)",
    WebkitBackdropFilter: "blur(0px)",
  },
  animate: {
    opacity: 1,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },
  exit: {
    opacity: 0,
    backdropFilter: "blur(0px)",
    WebkitBackdropFilter: "blur(0px)",
  },
  transition: { duration: CART_ANIMATION_DURATION, ease: "easeOut" as const },
};

const panelMotion = {
  initial: { x: "100%" },
  animate: { x: 0 },
  exit: { x: "100%" },
  transition: { duration: CART_ANIMATION_DURATION, ease: "easeOut" as const },
};

function getContactName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

export default function WholesaleShoppingCart() {
  const {
    cart,
    cartTotal,
    cartOpen,
    setCartOpen,
    updateQty,
    clearCart,
  } = useWholesaleCart();
  const { profile, user } = useSupabase();
  const locale = useLocale();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const wholesaleDashboardPath =
    locale === DEFAULT_LOCALE
      ? "/wholesale/dashboard"
      : `/${locale}/wholesale/dashboard`;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    if (!user || !profile) {
      toast.error("Please sign in to checkout.");
      return;
    }

    const customerName = getContactName(profile);
    const customerEmail = profile.email?.trim() ?? user.email?.trim() ?? "";
    const customerPhone = profile.phone?.trim() ?? "";

    if (!customerEmail) {
      toast.error("Please add an email to your profile before checkout.");
      return;
    }
    if (!customerPhone) {
      toast.error("Please add a phone number to your profile before checkout.");
      return;
    }

    setIsCheckingOut(true);
    try {
      const result = await invokeEdgeFunction<{ url?: string | null }>("checkout", {
        method: "POST",
        body: {
          mode: getClientStripeMode(),
          orderType: "wholesale",
          customerAccount: profile.id,
          customerName,
          customerEmail,
          customerPhone,
          origin: window.location.origin,
          returnTo: wholesaleDashboardPath,
          items: cart.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            unitPrice: Number((Number(item.unitPrice) * 1.1).toFixed(2)),
            itemName: item.productName,
          })),
        },
      });

      if (!result.ok) {
        throw new Error(result.error || "Checkout failed");
      }

      const checkoutUrl = result.data.url;
      if (!checkoutUrl) {
        throw new Error("No checkout URL returned");
      }

      setCartOpen(false);
      toast.success("Redirecting to secure payment…");
      window.location.href = checkoutUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout failed";
      toast.error(message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <AnimatePresence>
      {cartOpen ? (
        <>
          <motion.button
            key="wholesale-cart-backdrop"
            type="button"
            aria-label="Close cart"
            className="fixed inset-0 z-50 bg-black/60"
            onClick={() => setCartOpen(false)}
            {...backdropMotion}
          />
          <motion.div
            key="wholesale-cart-panel"
            className="fixed inset-y-0 right-0 z-[51] flex w-full flex-col border-l border-white/10 bg-black shadow-2xl sm:max-w-md"
            {...panelMotion}
          >
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
              onClick={() => void handleCheckout()}
              disabled={isCheckingOut}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {isCheckingOut ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Checkout with Card / Apple Pay
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-xs text-white/30 text-center">
              Secure payment via Stripe · Card & Apple Pay accepted
            </p>
          </div>
        ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
