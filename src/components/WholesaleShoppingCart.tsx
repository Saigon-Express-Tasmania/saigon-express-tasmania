"use client";

import { useEffect, useState } from "react";
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

function MinimumOrderProgress({
  cartTotal,
  minimumOrderValue,
  highlight,
}: {
  cartTotal: number;
  minimumOrderValue: number;
  highlight: boolean;
}) {
  const progress = Math.min(cartTotal / minimumOrderValue, 1);
  const remaining = Math.max(minimumOrderValue - cartTotal, 0);
  const hasMetMinimum = cartTotal >= minimumOrderValue;
  const progressPercent = Math.round(progress * 100);

  return (
    <motion.div
      animate={
        highlight
          ? {
              scale: [1, 1.02, 1],
              x: [0, -8, 8, -6, 6, 0],
            }
          : { scale: 1, x: 0 }
      }
      transition={{ duration: 0.65, ease: "easeInOut" }}
      className={`rounded-2xl border p-4 space-y-3 ${
        hasMetMinimum
          ? "border-green-400/40 bg-green-500/10"
          : "border-amber-400/50 bg-amber-500/15"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
              hasMetMinimum ? "text-green-200/90" : "text-amber-200"
            }`}
          >
            {hasMetMinimum ? "Minimum order reached" : "Minimum order required"}
          </p>
          <p className="mt-1 text-xl font-bold text-white leading-none">
            ${cartTotal.toFixed(2)}
            <span className="ml-2 text-sm font-medium text-white/45">
              / ${minimumOrderValue.toFixed(2)} ex GST
            </span>
          </p>
        </div>
        <div
          className={`rounded-xl px-3 py-2 text-lg font-black tabular-nums ${
            hasMetMinimum
              ? "bg-green-500/20 text-green-300"
              : "bg-amber-500/25 text-amber-200"
          }`}
        >
          {progressPercent}%
        </div>
      </div>

      <div className="h-4 rounded-full bg-black/35 overflow-hidden border border-white/10">
        <motion.div
          className={`h-full rounded-full ${
            hasMetMinimum
              ? "bg-gradient-to-r from-green-400 to-green-500"
              : "bg-gradient-to-r from-amber-300 via-amber-400 to-primary"
          }`}
          initial={false}
          animate={{ width: `${progressPercent}%` }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
        />
      </div>

      {hasMetMinimum ? (
        <p className="text-sm font-medium text-green-100/90">
          You can proceed to checkout.
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-amber-50/95">
          Add{" "}
          <span className="font-bold text-white">
            ${remaining.toFixed(2)} more
          </span>{" "}
          in products to reach the ${minimumOrderValue.toFixed(2)} wholesale
          minimum before checkout.
        </p>
      )}
    </motion.div>
  );
}

export default function WholesaleShoppingCart() {
  const {
    cart,
    cartTotal,
    minimumOrderValue,
    cartOpen,
    setCartOpen,
    updateQty,
    clearCart,
  } = useWholesaleCart();
  const { profile, user } = useSupabase();
  const locale = useLocale();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [minimumWarning, setMinimumWarning] = useState<string | null>(null);
  const [highlightMinimum, setHighlightMinimum] = useState(false);

  const hasMetMinimum = cartTotal >= minimumOrderValue;
  const remainingToMinimum = Math.max(minimumOrderValue - cartTotal, 0);

  const clearMinimumFeedback = () => {
    setMinimumWarning(null);
    setHighlightMinimum(false);
  };

  useEffect(() => {
    if (hasMetMinimum) {
      clearMinimumFeedback();
    }
  }, [hasMetMinimum]);

  useEffect(() => {
    clearMinimumFeedback();
  }, [cartOpen, cart]);

  const wholesaleDashboardPath =
    locale === DEFAULT_LOCALE
      ? "/wholesale/shop"
      : `/${locale}/wholesale/shop`;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    if (!hasMetMinimum) {
      const message = `Your cart is $${cartTotal.toFixed(2)} ex GST. Wholesale orders must reach $${minimumOrderValue.toFixed(2)} in product value before checkout. Please add $${remainingToMinimum.toFixed(2)} more to your cart.`;
      setMinimumWarning(message);
      setHighlightMinimum(true);
      toast.error(message, { duration: 6000 });
      window.setTimeout(() => setHighlightMinimum(false), 700);
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
            <MinimumOrderProgress
              cartTotal={cartTotal}
              minimumOrderValue={minimumOrderValue}
              highlight={highlightMinimum}
            />

            {minimumWarning && !hasMetMinimum ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-amber-400/60 bg-amber-500/20 px-4 py-3 text-sm leading-relaxed text-amber-50"
                role="alert"
              >
                <p className="font-semibold text-white">More products needed</p>
                <p className="mt-1">{minimumWarning}</p>
              </motion.div>
            ) : null}

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
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm transition-colors disabled:opacity-60 ${
                hasMetMinimum
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-white/10 text-white hover:bg-white/15 border border-amber-400/40"
              }`}
            >
              {isCheckingOut ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing…
                </>
              ) : hasMetMinimum ? (
                <>
                  <CreditCard className="w-4 h-4" />
                  Checkout with Card / Apple Pay
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Add ${remainingToMinimum.toFixed(2)} more to checkout
                </>
              )}
            </button>
            <p className="text-xs text-white/30 text-center">
              {hasMetMinimum
                ? "Secure payment via Stripe · Card & Apple Pay accepted"
                : `Wholesale minimum is $${minimumOrderValue.toFixed(2)} ex GST in product value.`}
            </p>
          </div>
        ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
