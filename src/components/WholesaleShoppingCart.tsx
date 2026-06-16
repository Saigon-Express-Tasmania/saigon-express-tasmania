"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWholesaleCart } from "@/contexts/WholesaleCartContext";
import { useWholesaleInventory } from "@/contexts/WholesaleInventoryContext";
import { useSupabase } from "@/hooks/useSupabase";
import { getClientStripeMode } from "@/lib/stripe-mode";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import { useLocale } from "next-intl";
import { DEFAULT_LOCALE } from "@/config/localize";
import WholesaleCartItemThumbnail from "@/components/WholesaleCartItemThumbnail";
import WholesaleOrderReviewPanel from "@/components/WholesaleOrderReviewPanel";
import {
  buildWholesaleOrderReviewFromProfile,
  serializeWholesaleOrderReviewForCheckout,
  validateWholesaleOrderReview,
} from "@/lib/wholesale-b2b-order";
import {
  buildWholesaleCartItemsSignature,
  clearWholesaleOrderReviewDraft,
  hydrateWholesaleOrderReview,
} from "@/lib/wholesale-order-review-storage";
import { computeWholesaleTierDiscount } from "@/lib/wholesale-tier-discount";
import { formatTierDiscountValue } from "@/types";
import type { StoreLocation, WholesaleOrderReviewForm } from "@/types";
import {
  ChevronRight,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { UserProfileSelfUpdate } from "@/types/UserProfile";

type CartSidebarView = "cart" | "review";

function toPricingLines(
  cart: { qty: number; unitPrice: number }[],
): { qty: number; unitPriceExGst: number }[] {
  return cart.map((item) => ({
    qty: item.qty,
    unitPriceExGst: Number(item.unitPrice),
  }));
}

const CART_ANIMATION_DURATION = 0.24;
const QTY_FIELD_CLASS =
  "h-7 w-[4.5rem] min-w-[4.5rem] shrink-0 rounded-lg bg-white/10 text-center text-sm font-bold text-white tabular-nums";

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

function WholesaleCartItemQtyControl({
  productName,
  qty,
  maxQty,
  isActive,
  isEditing,
  onToggleEdit,
  onCommitQty,
  onDecrease,
  onIncrease,
  onSliderDragStart,
  onSliderDragEnd,
  atMin,
  atMax,
}: {
  productName: string;
  qty: number;
  maxQty: number;
  isActive: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  onCommitQty: (nextQty: number) => void;
  onDecrease: () => void;
  onIncrease: () => void;
  onSliderDragStart: () => void;
  onSliderDragEnd: () => void;
  atMin: boolean;
  atMax: boolean;
}) {
  const inputId = useId();
  const sliderId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftQty, setDraftQty] = useState(String(qty));
  const finiteMaxQty =
    Number.isFinite(maxQty) && maxQty > 0 ? maxQty : null;
  const showSlider = isActive && finiteMaxQty != null;

  useEffect(() => {
    setDraftQty(String(qty));
  }, [qty]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commitDraftQty = () => {
    const parsed = Number.parseInt(draftQty, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setDraftQty(String(qty));
      return;
    }
    onCommitQty(parsed);
  };

  const handleSliderChange = (value: number) => {
    setDraftQty(String(value));
    onCommitQty(value);
  };

  return (
    <div className="mt-2 flex w-full items-center gap-2 min-w-0">
      <button
        type="button"
        onClick={onDecrease}
        disabled={atMin}
        className="w-7 h-7 shrink-0 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus className="w-3 h-3" />
      </button>
      {isEditing ? (
        <input
          ref={inputRef}
          id={inputId}
          type="number"
          inputMode="numeric"
          min={1}
          max={finiteMaxQty ?? undefined}
          value={draftQty}
          onChange={(e) => setDraftQty(e.target.value)}
          onBlur={commitDraftQty}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraftQty();
              onToggleEdit();
            }
            if (e.key === "Escape") {
              setDraftQty(String(qty));
              onToggleEdit();
            }
          }}
          className={`${QTY_FIELD_CLASS} border border-primary/50 bg-black/40 px-1 focus:outline-none focus:ring-2 focus:ring-primary/40 [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          aria-label={`Quantity for ${productName}`}
        />
      ) : (
        <button
          type="button"
          onClick={onToggleEdit}
          className={`${QTY_FIELD_CLASS} px-2 hover:bg-white/20 transition-colors`}
          aria-expanded={showSlider}
          aria-controls={sliderId}
        >
          {qty}
        </button>
      )}
      <button
        type="button"
        onClick={onIncrease}
        disabled={atMax}
        className="w-7 h-7 shrink-0 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus className="w-3 h-3" />
      </button>
      <AnimatePresence initial={false}>
        {showSlider ? (
          <motion.div
            id={sliderId}
            key="qty-slider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex min-w-0 flex-1 basis-0 items-center"
          >
            <input
              type="range"
              min={1}
              max={finiteMaxQty}
              step={1}
              value={Math.min(qty, finiteMaxQty)}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              onPointerDown={onSliderDragStart}
              onPointerUp={onSliderDragEnd}
              onPointerCancel={onSliderDragEnd}
              onLostPointerCapture={onSliderDragEnd}
              className="h-2 w-full min-w-0 cursor-pointer appearance-none rounded-full bg-white/15 accent-primary [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              aria-label={`Set quantity for ${productName}`}
              aria-valuemin={1}
              aria-valuemax={finiteMaxQty}
              aria-valuenow={qty}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function WholesaleShoppingCart({
  storeLocations,
}: {
  storeLocations: StoreLocation[];
}) {
  const {
    cart,
    cartTotal,
    pricingTiers,
    minimumOrderValue,
    cartOpen,
    highlightProductId,
    setCartOpen,
    clearCartHighlight,
    updateQty,
    setCartQty,
    clearCart,
  } = useWholesaleCart();
  const { getMaxQty, validateQty, getAvailability } = useWholesaleInventory();
  const { profile, user, updateOwnProfile } = useSupabase();
  const locale = useLocale();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [minimumWarning, setMinimumWarning] = useState<string | null>(null);
  const [highlightMinimum, setHighlightMinimum] = useState(false);
  const [activeQtyProductId, setActiveQtyProductId] = useState<number | null>(
    null,
  );
  const [editingQtyProductId, setEditingQtyProductId] = useState<number | null>(
    null,
  );
  const [sliderDragProductId, setSliderDragProductId] = useState<number | null>(
    null,
  );
  const [cartView, setCartView] = useState<CartSidebarView>("cart");
  const [orderReview, setOrderReview] = useState<WholesaleOrderReviewForm | null>(
    null,
  );
  const highlightedItemRef = useRef<HTMLDivElement | null>(null);

  const sortedCart = useMemo(
    () =>
      [...cart].sort(
        (a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0),
      ),
    [cart],
  );

  const pricingLines = useMemo(() => toPricingLines(cart), [cart]);
  const tierTotals = useMemo(
    () => computeWholesaleTierDiscount(pricingLines, pricingTiers),
    [pricingLines, pricingTiers],
  );

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

  useEffect(() => {
    if (!cartOpen) {
      setActiveQtyProductId(null);
      setEditingQtyProductId(null);
      setSliderDragProductId(null);
      setCartView("cart");
      setOrderReview(null);
    }
  }, [cartOpen]);

  useEffect(() => {
    if (!cartOpen && !isCheckingOut) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [cartOpen, isCheckingOut]);

  useEffect(() => {
    if (!cartOpen || highlightProductId == null) return;

    highlightedItemRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });

    const timeout = window.setTimeout(() => {
      clearCartHighlight();
    }, 2800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [cartOpen, highlightProductId, clearCartHighlight, sortedCart]);

  const activateCartItem = (productId: number) => {
    setActiveQtyProductId(productId);
  };

  const deactivateCartItem = (productId: number) => {
    if (
      editingQtyProductId === productId ||
      sliderDragProductId === productId
    ) {
      return;
    }
    setActiveQtyProductId((current) =>
      current === productId ? null : current,
    );
  };

  const commitItemQty = (
    productId: number,
    productName: string,
    rawQty: number,
  ) => {
    const maxQty = getMaxQty(productId);
    let nextQty = Math.max(1, Math.floor(rawQty));

    if (Number.isFinite(maxQty)) {
      nextQty = Math.min(nextQty, maxQty);
    }

    const validation = validateQty(productId, nextQty, productName);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    setCartQty(productId, nextQty);
  };

  const handleIncreaseQty = (productId: number, productName: string, qty: number) => {
    const nextQty = qty + 1;
    const validation = validateQty(productId, nextQty, productName);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    updateQty(productId, 1);
  };

  const wholesaleDashboardPath =
    locale === DEFAULT_LOCALE
      ? "/wholesale/shop"
      : `/${locale}/wholesale/shop`;
  const wholesaleOrdersPath =
    locale === DEFAULT_LOCALE
      ? "/wholesale/orders"
      : `/${locale}/wholesale/orders`;

  const handleBeginReview = () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    for (const item of cart) {
      const validation = validateQty(item.productId, item.qty, item.productName);
      if (!validation.ok) {
        toast.error(validation.message, { duration: 6000 });
        return;
      }
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

    const baseReview = buildWholesaleOrderReviewFromProfile(
      profile,
      customerEmail,
      cartTotal,
      pricingTiers,
    );
    setOrderReview(
      hydrateWholesaleOrderReview(
        baseReview,
        buildWholesaleCartItemsSignature(sortedCart),
        pricingLines,
        pricingTiers,
      ),
    );
    setCartView("review");
  };

  const handleConfirmPayment = async () => {
    if (!user || !profile || !orderReview) {
      toast.error("Please sign in to checkout.");
      return;
    }

    const validationError = validateWholesaleOrderReview(orderReview);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const checkoutFields = serializeWholesaleOrderReviewForCheckout(orderReview);

    const trimOrNull = (value: string | null | undefined): string | null => {
      const next = String(value ?? "").trim();
      return next ? next : null;
    };

    const profileBackfill: UserProfileSelfUpdate = {};
    const applyIfBlank = <K extends keyof UserProfileSelfUpdate>(
      key: K,
      profileValue: string | null | undefined,
      reviewValue: string | null | undefined,
    ) => {
      if (trimOrNull(profileValue)) return;
      const candidate = trimOrNull(reviewValue);
      if (candidate) {
        profileBackfill[key] = candidate as UserProfileSelfUpdate[K];
      }
    };

    applyIfBlank("phone", profile.phone, orderReview.customer_phone);
    applyIfBlank("shipping_dba_name", profile.shipping_dba_name, orderReview.shipping_dba_name);
    applyIfBlank(
      "shipping_preferred_window",
      profile.shipping_preferred_window,
      orderReview.shipping_preferred_window,
    );
    applyIfBlank("shipping_address", profile.shipping_address, orderReview.shipping_address);
    applyIfBlank("shipping_city", profile.shipping_city, orderReview.shipping_city);
    applyIfBlank("shipping_state", profile.shipping_state, orderReview.shipping_state);
    applyIfBlank(
      "shipping_postal_code",
      profile.shipping_postal_code,
      orderReview.shipping_postal_code,
    );
    applyIfBlank("shipping_country", profile.shipping_country, orderReview.shipping_country);
    applyIfBlank("billing_legal_name", profile.billing_legal_name, orderReview.billing_legal_name);
    applyIfBlank("billing_tax_id", profile.billing_tax_id, orderReview.billing_tax_id);
    applyIfBlank("billing_address", profile.billing_address, orderReview.billing_address);
    applyIfBlank("billing_city", profile.billing_city, orderReview.billing_city);
    applyIfBlank("billing_state", profile.billing_state, orderReview.billing_state);
    applyIfBlank(
      "billing_postal_code",
      profile.billing_postal_code,
      orderReview.billing_postal_code,
    );
    applyIfBlank("billing_country", profile.billing_country, orderReview.billing_country);

    setIsCheckingOut(true);
    try {
      if (Object.keys(profileBackfill).length > 0) {
        await updateOwnProfile(profileBackfill);
      }

      const result = await invokeEdgeFunction<{ url?: string | null }>("checkout", {
        method: "POST",
        body: {
          mode: getClientStripeMode(),
          orderType: "wholesale",
          customerAccount: profile.id,
          origin: window.location.origin,
          returnTo: wholesaleDashboardPath,
          successReturnTo: wholesaleOrdersPath,
          ...checkoutFields,
          items: cart.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            unitPrice: Number(item.unitPrice),
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

      clearWholesaleOrderReviewDraft();
      setCartOpen(false);
      toast.success("Redirecting to secure payment…");
      window.location.href = checkoutUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout failed";
      toast.error(message);
      setIsCheckingOut(false);
    }
  };

  return (
    <>
      {isCheckingOut ? (
        <div
          className="fixed inset-0 z-[100] flex cursor-wait items-center justify-center bg-black/55 backdrop-blur-[2px]"
          aria-busy="true"
          aria-live="polite"
          role="alertdialog"
          aria-label="Preparing checkout"
        >
          <div className="mx-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/90 px-6 py-4 shadow-2xl">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
            <p className="text-sm font-semibold text-white">
              Preparing secure checkout…
            </p>
          </div>
        </div>
      ) : null}
      <AnimatePresence>
      {cartOpen ? (
        <>
          <motion.button
            key="wholesale-cart-backdrop"
            type="button"
            aria-label="Close cart"
            className="fixed inset-0 z-50 bg-black/60"
            onClick={() => {
              if (!isCheckingOut) {
                setCartView("cart");
                setCartOpen(false);
              }
            }}
            {...backdropMotion}
          />
          <motion.div
            key="wholesale-cart-panel"
            className={`fixed inset-y-0 right-0 z-[51] flex min-h-0 w-full flex-col border-l border-white/10 bg-black shadow-2xl ${
              cartView === "review"
                ? "sm:max-w-2xl lg:max-w-3xl"
                : "sm:max-w-md"
            }`}
            {...panelMotion}
          >
        {cartView === "review" && orderReview ? (
          <WholesaleOrderReviewPanel
            items={sortedCart}
            cartSubtotalExGst={cartTotal}
            pricingTiers={pricingTiers}
            storeLocations={storeLocations}
            profile={profile}
            review={orderReview}
            onReviewChange={setOrderReview}
            onBack={() => setCartView("cart")}
            onConfirm={() => void handleConfirmPayment()}
            isCheckingOut={isCheckingOut}
          />
        ) : (
        <>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2 text-yellow-400">
            <ShoppingCart className="w-5 h-5" /> Wholesale Cart
          </h2>
          <div className="flex items-center gap-3">
            {cart.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  clearWholesaleOrderReviewDraft();
                  clearCart();
                }}
                disabled={isCheckingOut}
                className="text-xs text-white/30 hover:text-red-400 transition-colors disabled:pointer-events-none disabled:opacity-40"
              >
                Clear all
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setCartOpen(false)}
              disabled={isCheckingOut}
              className="text-white/40 hover:text-white transition-colors text-2xl leading-none disabled:pointer-events-none disabled:opacity-40"
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
            sortedCart.map((item) => {
              const maxQty = getMaxQty(item.productId);
              const atMin = item.qty <= 1;
              const atMax =
                Number.isFinite(maxQty) && item.qty >= maxQty;
              const availability = getAvailability(item.productId);

              const isItemActive = activeQtyProductId === item.productId;
              const isItemEditing = editingQtyProductId === item.productId;
              const isHighlighted = highlightProductId === item.productId;

              return (
              <motion.div
                key={item.productId}
                ref={isHighlighted ? highlightedItemRef : undefined}
                tabIndex={0}
                animate={isHighlighted ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                transition={{ duration: 0.75, ease: "easeInOut" }}
                className={`p-4 rounded-xl border transition-colors outline-none ${
                  isHighlighted
                    ? "bg-green-500/15 border-green-400/50 ring-2 ring-green-400/50"
                    : isItemActive
                      ? "bg-white/8 border-white/20 ring-1 ring-primary/25"
                      : "bg-white/5 border-white/10"
                }`}
                onMouseEnter={() => activateCartItem(item.productId)}
                onMouseLeave={() => deactivateCartItem(item.productId)}
                onFocus={() => activateCartItem(item.productId)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    deactivateCartItem(item.productId);
                  }
                }}
                onTouchStart={() => activateCartItem(item.productId)}
              >
                <div className="flex items-start gap-3">
                  <WholesaleCartItemThumbnail
                    imageUrl={item.imageUrl}
                    alt={item.productName}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug">
                      {item.productName}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      ${Number(item.unitPrice).toFixed(2)} ex GST
                    </p>
                    {availability && Number.isFinite(maxQty) ? (
                      <p className="text-[11px] text-amber-200/80 mt-1">
                        {maxQty} available today
                      </p>
                    ) : null}
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
                <WholesaleCartItemQtyControl
                  productName={item.productName}
                  qty={item.qty}
                  maxQty={maxQty}
                  isActive={isItemActive}
                  isEditing={isItemEditing}
                  atMin={atMin}
                  atMax={atMax}
                  onToggleEdit={() => {
                    activateCartItem(item.productId);
                    setEditingQtyProductId((current) =>
                      current === item.productId ? null : item.productId,
                    );
                  }}
                  onCommitQty={(nextQty) =>
                    commitItemQty(item.productId, item.productName, nextQty)
                  }
                  onDecrease={() => {
                    if (item.qty > 1) {
                      updateQty(item.productId, -1);
                    }
                  }}
                  onIncrease={() =>
                    handleIncreaseQty(
                      item.productId,
                      item.productName,
                      item.qty,
                    )
                  }
                  onSliderDragStart={() =>
                    setSliderDragProductId(item.productId)
                  }
                  onSliderDragEnd={() =>
                    setSliderDragProductId((current) =>
                      current === item.productId ? null : current,
                    )
                  }
                />
              </motion.div>
            );
            })
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
                ${tierTotals.subtotalExGst.toFixed(2)}
              </span>
            </div>
            {tierTotals.wholesaleDiscount > 0 && tierTotals.appliedTier ? (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">
                  {tierTotals.appliedTier.label} tier (
                  {formatTierDiscountValue(tierTotals.appliedTier.discountValue)} off)
                </span>
                <span className="font-bold text-green-300">
                  -${tierTotals.wholesaleDiscount.toFixed(2)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-sm">
              <span className="text-white/60">GST (10%)</span>
              <span className="font-bold text-white">
                ${tierTotals.taxTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-white/10 pt-3">
              <span className="text-white">Total (inc GST)</span>
              <span className="text-primary">
                ${tierTotals.grandTotal.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleBeginReview}
              disabled={isCheckingOut}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm transition-colors disabled:opacity-60 ${
                hasMetMinimum
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-white/10 text-white hover:bg-white/15 border border-amber-400/40"
              }`}
            >
              {hasMetMinimum ? (
                <>
                  <CreditCard className="w-4 h-4" />
                  Review order
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
                ? "Review shipping and billing before payment"
                : `Wholesale minimum is $${minimumOrderValue.toFixed(2)} ex GST in product value.`}
            </p>
          </div>
        ) : null}
        </>
        )}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
    </>
  );
}
