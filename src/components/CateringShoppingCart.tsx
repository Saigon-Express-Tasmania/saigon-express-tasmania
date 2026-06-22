"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CateringOrderReviewPanel from "@/components/CateringOrderReviewPanel";
import WholesaleCartItemThumbnail from "@/components/WholesaleCartItemThumbnail";
import { useCateringCart } from "@/contexts/CateringCartContext";
import { useGuestCateringOrder } from "@/contexts/GuestCateringOrderContext";
import { useSupabase } from "@/hooks/useSupabase";
import {
  buildCateringOrderReviewForGuest,
  buildCateringOrderReviewFromProfile,
  serializeCateringOrderReviewForPlacement,
  validateCateringOrderReview,
  withCateringOrderTotals,
} from "@/lib/catering-order-review";
import { useCommerceTax } from "@/contexts/CommerceTaxContext";
import {
  buildCateringCartItemsSignature,
  clearCateringOrderReviewDraft,
  extractPersistableCateringReviewFields,
  hydrateCateringOrderReview,
  readCateringOrderReviewDraft,
  writeCateringOrderReviewDraft,
} from "@/lib/catering-order-review-storage";
import { formatAud } from "@/lib/catering-price";
import {
  formatRateLimitCooldown,
  getCateringOrderRateLimitState,
  recordCateringOrderPlacement,
} from "@/lib/catering-order-rate-limit";
import { getClientStripeMode } from "@/lib/stripe-mode";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import type { CateringOrderReviewForm } from "@/types/CateringOrderReview";
import type { UserProfileSelfUpdate } from "@/types/UserProfile";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ClipboardCheck,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

type CartSidebarView = "cart" | "review";

const CART_ANIMATION_DURATION = 0.24;

const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: CART_ANIMATION_DURATION, ease: "easeOut" as const },
};

const panelMotion = {
  initial: { x: "100%" },
  animate: { x: 0 },
  exit: { x: "100%" },
  transition: { duration: CART_ANIMATION_DURATION, ease: "easeOut" as const },
};

export default function CateringShoppingCart() {
  const router = useRouter();
  const commerceTax = useCommerceTax();
  const { profile, user, session, updateOwnProfile } = useSupabase();
  const { saveGuestOrder } = useGuestCateringOrder();
  const {
    cart,
    cartOpen,
    cartTotal,
    setCartOpen,
    updateQty,
    removeFromCart,
    clearCart,
  } = useCateringCart();
  const [cartView, setCartView] = useState<CartSidebarView>("cart");
  const [orderReview, setOrderReview] = useState<CateringOrderReviewForm | null>(
    null,
  );
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [rateLimitRemainingMs, setRateLimitRemainingMs] = useState(0);

  const isRateLimited = rateLimitRemainingMs > 0;
  const rateLimitCooldownLabel = formatRateLimitCooldown(rateLimitRemainingMs);

  const sortedCart = useMemo(
    () => [...cart].sort((a, b) => b.addedAt - a.addedAt),
    [cart],
  );

  const cartItemsSignature = useMemo(
    () => buildCateringCartItemsSignature(sortedCart),
    [sortedCart],
  );

  const persistReviewDraft = () => {
    if (!orderReview) return;
    writeCateringOrderReviewDraft({
      version: 1,
      cartItemsSignature,
      form: extractPersistableCateringReviewFields(orderReview),
    });
  };

  const closeCart = () => {
    if (cartView === "review" && orderReview) {
      persistReviewDraft();
    }
    setCartView("cart");
    setCartOpen(false);
  };

  useEffect(() => {
    if (!cartOpen && !isPlacingOrder) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [cartOpen, isPlacingOrder]);

  useEffect(() => {
    if (!cartOpen) {
      setCartView("cart");
    }
  }, [cartOpen]);

  useEffect(() => {
    const updateRateLimit = () => {
      setRateLimitRemainingMs(getCateringOrderRateLimitState().remainingMs);
    };

    updateRateLimit();
    const timerId = window.setInterval(updateRateLimit, 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const handleBeginReview = () => {
    if (isRateLimited) {
      toast.error(
        `Too many orders placed recently. Please wait ${rateLimitCooldownLabel} before reviewing another order.`,
      );
      return;
    }

    if (cart.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    if (orderReview) {
      const draft = readCateringOrderReviewDraft();
      if (!draft || draft.cartItemsSignature === cartItemsSignature) {
        setOrderReview(withCateringOrderTotals(orderReview, sortedCart, commerceTax));
        setCartView("review");
        return;
      }
    }

    if (user && profile) {
      const customerEmail = profile.email?.trim() ?? user.email?.trim() ?? "";
      const customerPhone = profile.phone?.trim() ?? "";

      if (!customerEmail) {
        toast.error("Please add an email to your profile before placing an order.");
        return;
      }
      if (!customerPhone) {
        toast.error("Please add a phone number to your profile before placing an order.");
        return;
      }

      setOrderReview(
        hydrateCateringOrderReview(
          buildCateringOrderReviewFromProfile(
            profile,
            customerEmail,
            sortedCart,
            commerceTax,
          ),
          cartItemsSignature,
          sortedCart,
          commerceTax,
        ),
      );
    } else {
      setOrderReview(
        hydrateCateringOrderReview(
          buildCateringOrderReviewForGuest(sortedCart, commerceTax),
          cartItemsSignature,
          sortedCart,
          commerceTax,
        ),
      );
    }

    setCartView("review");
  };

  const handlePlaceOrder = async () => {
    if (!orderReview) {
      toast.error("Please review your order details.");
      return;
    }

    const isMemberOrder = Boolean(user && profile);
    const accessToken = session?.access_token ?? null;

    if (isMemberOrder && !accessToken) {
      toast.error("Please sign in to place an order.");
      return;
    }

    const reviewForPlacement = withCateringOrderTotals(
      orderReview,
      sortedCart,
      commerceTax,
    );
    const validationError = validateCateringOrderReview(reviewForPlacement);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const placementFields = serializeCateringOrderReviewForPlacement(
      reviewForPlacement,
      commerceTax,
    );

    const trimOrNull = (value: string | null | undefined): string | null => {
      const next = String(value ?? "").trim();
      return next ? next : null;
    };

    setIsPlacingOrder(true);
    try {
      if (isMemberOrder && profile) {
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

        applyIfBlank("phone", profile.phone, reviewForPlacement.customer_phone);
        applyIfBlank(
          "shipping_dba_name",
          profile.shipping_dba_name,
          reviewForPlacement.shipping_dba_name,
        );
        applyIfBlank(
          "shipping_preferred_window",
          profile.shipping_preferred_window,
          reviewForPlacement.shipping_preferred_window,
        );
        applyIfBlank(
          "shipping_address",
          profile.shipping_address,
          reviewForPlacement.shipping_address,
        );
        applyIfBlank("shipping_city", profile.shipping_city, reviewForPlacement.shipping_city);
        applyIfBlank(
          "shipping_state",
          profile.shipping_state,
          reviewForPlacement.shipping_state,
        );
        applyIfBlank(
          "shipping_postal_code",
          profile.shipping_postal_code,
          reviewForPlacement.shipping_postal_code,
        );
        applyIfBlank(
          "shipping_country",
          profile.shipping_country,
          reviewForPlacement.shipping_country,
        );

        if (Object.keys(profileBackfill).length > 0) {
          await updateOwnProfile(profileBackfill);
        }
      }

      const result = await invokeEdgeFunction<{
        orderId: number;
        trackingToken: string;
        cancelToken: string;
        invoiceNumber: string;
      }>("catering-order", {
        method: "POST",
        accessToken,
        body: {
          mode: getClientStripeMode(),
          ...(isMemberOrder && profile
            ? { customerAccount: profile.id }
            : {}),
          ...placementFields,
          items: cart.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            unitPrice: Number(item.unitPrice),
            itemName: item.variantLabel
              ? `${item.productName} (${item.variantLabel})`
              : item.productName,
          })),
        },
      });

      if (!result.ok) {
        throw new Error(result.error || "Failed to place catering order");
      }

      recordCateringOrderPlacement();
      setRateLimitRemainingMs(getCateringOrderRateLimitState().remainingMs);

      const trackingToken = result.data.trackingToken;

      if (isMemberOrder) {
        clearCateringOrderReviewDraft();
        clearCart();
        setCartView("cart");
        setOrderReview(null);
        setCartOpen(false);
        setIsPlacingOrder(false);
        router.push("/member/catering-orders?placed=success");
        return;
      }

      saveGuestOrder({
        orderId: result.data.orderId,
        trackingToken,
        cancelToken: result.data.cancelToken,
        invoiceNumber: result.data.invoiceNumber,
        placedAt: Date.now(),
      });
      clearCateringOrderReviewDraft();
      clearCart();
      setCartView("cart");
      setOrderReview(null);
      setCartOpen(false);
      setIsPlacingOrder(false);
      toast.success("Order placed! We are preparing your quotation.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to place catering order";
      toast.error(message);
      setIsPlacingOrder(false);
    }
  };

  return (
    <>
      {isPlacingOrder ? (
        <div
          className="fixed inset-0 z-[100] flex cursor-wait items-center justify-center bg-black/55 backdrop-blur-[2px]"
          aria-busy="true"
          aria-live="polite"
          role="alertdialog"
          aria-label="Placing catering order"
        >
          <div className="mx-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/90 px-6 py-4 shadow-2xl">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-400" />
            <p className="text-sm font-semibold text-white">
              Submitting your catering order…
            </p>
          </div>
        </div>
      ) : null}
      <AnimatePresence>
        {cartOpen ? (
          <>
            <motion.button
              key="catering-cart-backdrop"
              type="button"
              aria-label="Close cart"
              className="fixed inset-0 z-50 bg-black/60"
              onClick={() => {
                if (!isPlacingOrder) {
                  closeCart();
                }
              }}
              {...backdropMotion}
            />
            <motion.aside
              key="catering-cart-panel"
              className={`fixed inset-y-0 right-0 z-[51] flex min-h-0 w-full flex-col border-l border-white/10 bg-black shadow-2xl ${
                cartView === "review" ? "sm:max-w-2xl lg:max-w-3xl" : "sm:max-w-md"
              }`}
              {...panelMotion}
            >
              {cartView === "review" && orderReview ? (
                <CateringOrderReviewPanel
                  items={sortedCart}
                  review={orderReview}
                  profile={profile}
                  onReviewChange={setOrderReview}
                  onBack={() => setCartView("cart")}
                  onConfirm={() => void handlePlaceOrder()}
                  isPlacingOrder={isPlacingOrder}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                    <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-emerald-400">
                      <ShoppingCart className="h-5 w-5" />
                      Catering Cart
                    </h2>
                    <div className="flex items-center gap-3">
                      {cart.length > 0 ? (
                        <button
                          type="button"
                          onClick={clearCart}
                          disabled={isPlacingOrder}
                          className="text-xs text-white/30 transition-colors hover:text-red-400 disabled:pointer-events-none disabled:opacity-40"
                        >
                          Clear all
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={closeCart}
                        disabled={isPlacingOrder}
                        className="text-2xl leading-none text-white/40 transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-40"
                      >
                        &times;
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    {sortedCart.length === 0 ? (
                      <div className="py-16 text-center text-white/30">
                        <ShoppingCart className="mx-auto mb-3 h-12 w-12 opacity-30" />
                        <p>Your cart is empty</p>
                        <p className="mt-1 text-xs">Add catering packs to get started</p>
                      </div>
                    ) : (
                      sortedCart.map((item) => (
                        <div
                          key={item.lineKey}
                          className="rounded-xl border border-white/10 bg-white/5 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <WholesaleCartItemThumbnail
                              imageUrl={item.imageUrl}
                              alt={item.productName}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold leading-snug text-white">
                                {item.productName}
                              </p>
                              {item.variantLabel ? (
                                <p className="mt-0.5 text-xs text-white/45">
                                  {item.variantLabel}
                                </p>
                              ) : null}
                              <p className="mt-0.5 text-xs text-white/40">
                                {formatAud(item.unitPrice)} each
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-bold text-white">
                                {formatAud(item.unitPrice * item.qty)}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.lineKey)}
                                className="mt-2 text-white/30 transition-colors hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => updateQty(item.lineKey, -1)}
                              disabled={item.qty <= 1}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white disabled:opacity-40"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-white">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.lineKey, 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {sortedCart.length > 0 ? (
                    <div className="space-y-4 border-t border-white/10 px-6 py-5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/45">Subtotal</span>
                        <span className="text-lg font-bold text-white">
                          {formatAud(cartTotal)} est
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleBeginReview}
                        disabled={isPlacingOrder || isRateLimited}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        {isRateLimited
                          ? `Please wait ${rateLimitCooldownLabel}`
                          : "Review order"}
                        {!isRateLimited ? <ChevronRight className="h-4 w-4" /> : null}
                      </button>
                      <p className="text-center text-xs text-white/30">
                        {isRateLimited
                          ? "You can place up to 5 catering orders every 10 minutes."
                          : "Review event and delivery details before placing your order"}
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
