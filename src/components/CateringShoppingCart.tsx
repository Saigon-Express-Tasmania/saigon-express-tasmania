"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CateringOrderReviewPanel from "@/components/CateringOrderReviewPanel";
import WholesaleCartItemThumbnail from "@/components/WholesaleCartItemThumbnail";
import CustomisationSummary from "@/components/CustomisationSummary";
import { useCateringCart, cateringCartLineUnitPrice, cateringCartCheckoutLine } from "@/contexts/CateringCartContext";
import { useGuestCateringOrder } from "@/contexts/GuestCateringOrderContext";
import { useSupabase } from "@/hooks/useSupabase";
import {
  buildCateringOrderReviewForGuest,
  buildCateringOrderReviewFromProfile,
  isCateringPickup,
  isCateringBillingSameAsShipping,
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
  readCateringOrderReviewBillingSameAsShipping,
  readCateringOrderReviewDraft,
  writeCateringGuestCheckoutProfile,
  writeCateringOrderReviewDraft,
} from "@/lib/catering-order-review-storage";
import { formatAud, isCateringUnitPriceEstimated } from "@/lib/catering-price";
import {
  formatRateLimitCooldown,
  getCateringOrderRateLimitState,
  recordCateringOrderPlacement,
} from "@/lib/catering-order-rate-limit";
import { getClientStripeMode } from "@/lib/stripe-mode";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import type { SelfDeliveryFee } from "@/lib/self-delivery-fee";
import type { DeliveryCity, StoreLocation } from "@/types";
import type { CateringOrderReviewForm } from "@/types/CateringOrderReview";
import type { UserProfileSelfUpdate } from "@/types/UserProfile";
import { usePathname, useRouter } from "next/navigation";
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

export default function CateringShoppingCart({
  storeLocations,
  deliveryCities,
  selfDeliveryFee,
  selfDeliveryOrigin,
}: {
  storeLocations: StoreLocation[];
  deliveryCities: DeliveryCity[];
  selfDeliveryFee: SelfDeliveryFee;
  selfDeliveryOrigin: string;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "/catering";
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
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [rateLimitRemainingMs, setRateLimitRemainingMs] = useState(0);

  const isRateLimited = rateLimitRemainingMs > 0;
  const rateLimitCooldownLabel = formatRateLimitCooldown(rateLimitRemainingMs);

  const sortedCart = useMemo(
    () => [...cart].sort((a, b) => b.addedAt - a.addedAt),
    [cart],
  );

  const totalsOptions = useMemo(
    () => ({
      tax: commerceTax,
      deliveryCities,
      selfDeliveryFee,
    }),
    [commerceTax, deliveryCities, selfDeliveryFee],
  );

  const cartItemsSignature = useMemo(
    () => buildCateringCartItemsSignature(sortedCart),
    [sortedCart],
  );

  const isCartTotalEstimated = useMemo(
    () =>
      sortedCart.some((item) =>
        isCateringUnitPriceEstimated(item.catalogUnitPrice),
      ),
    [sortedCart],
  );

  const persistReviewDraft = () => {
    if (!orderReview) return;
    writeCateringOrderReviewDraft({
      version: 1,
      cartItemsSignature,
      billingSameAsShipping:
        readCateringOrderReviewBillingSameAsShipping(cartItemsSignature) ??
        (!isCateringPickup(orderReview) &&
          isCateringBillingSameAsShipping(orderReview)),
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

  const isProcessing = isPlacingOrder || isCheckingOut;

  useEffect(() => {
    if (!cartOpen && !isProcessing) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [cartOpen, isProcessing]);

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

  useEffect(() => {
    if (!orderReview || profile) return;
    writeCateringGuestCheckoutProfile(orderReview);
  }, [orderReview, profile]);

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
        setOrderReview(withCateringOrderTotals(orderReview, sortedCart, totalsOptions));
        setCartView("review");
        return;
      }
    }

    if (user && profile) {
      const customerEmail = profile.email?.trim() ?? user.email?.trim() ?? "";

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
          totalsOptions,
        ),
      );
    } else {
      setOrderReview(
        hydrateCateringOrderReview(
          buildCateringOrderReviewForGuest(sortedCart, commerceTax),
          cartItemsSignature,
          sortedCart,
          commerceTax,
          totalsOptions,
        ),
      );
    }

    setCartView("review");
  };

  const handlePlaceQuoteOrder = async () => {
    if (!orderReview) {
      toast.error("Please review your order details.");
      return;
    }

    const accessToken = session?.access_token ?? null;
    const isAuthenticatedMember = Boolean(user && profile && accessToken);

    const reviewForPlacement = withCateringOrderTotals(
      orderReview,
      sortedCart,
      totalsOptions,
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
      if (isAuthenticatedMember && profile) {
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
          ...(isAuthenticatedMember && profile
            ? { customerAccount: profile.id }
            : {}),
          ...placementFields,
          items: cart.map((item) => cateringCartCheckoutLine(item)),
        },
      });

      if (!result.ok) {
        throw new Error(result.error || "Failed to place catering order");
      }

      recordCateringOrderPlacement();
      setRateLimitRemainingMs(getCateringOrderRateLimitState().remainingMs);

      const trackingToken = result.data.trackingToken;

      if (isAuthenticatedMember) {
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

  const handleConfirmPayment = async () => {
    if (!orderReview) {
      toast.error("Please review your order details.");
      return;
    }

    const accessToken = session?.access_token ?? null;
    const isAuthenticatedMember = Boolean(user && profile && accessToken);

    const reviewForPlacement = withCateringOrderTotals(
      orderReview,
      sortedCart,
      totalsOptions,
    );
    const validationError = validateCateringOrderReview(reviewForPlacement);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const checkoutFields = serializeCateringOrderReviewForPlacement(
      reviewForPlacement,
      commerceTax,
    );

    const trimOrNull = (value: string | null | undefined): string | null => {
      const next = String(value ?? "").trim();
      return next ? next : null;
    };

    setIsCheckingOut(true);
    try {
      if (isAuthenticatedMember && profile) {
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

      const successReturnTo = isAuthenticatedMember
        ? "/member/catering-orders"
        : pathname;

      const result = await invokeEdgeFunction<{ url?: string | null }>("checkout", {
        method: "POST",
        accessToken: accessToken ?? undefined,
        body: {
          mode: getClientStripeMode(),
          orderType: "catering",
          ...(isAuthenticatedMember && profile
            ? { customerAccount: profile.id }
            : {}),
          origin: window.location.origin,
          returnTo: pathname,
          successReturnTo,
          ...checkoutFields,
          items: cart.map((item) => cateringCartCheckoutLine(item)),
        },
      });

      if (!result.ok) {
        throw new Error(result.error || "Checkout failed");
      }

      const checkoutUrl = result.data.url;
      if (!checkoutUrl) {
        throw new Error("No checkout URL returned");
      }

      clearCateringOrderReviewDraft();
      setCartOpen(false);
      toast.success("Redirecting to secure payment…");
      window.location.href = checkoutUrl;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Checkout failed";
      toast.error(message);
      setIsCheckingOut(false);
    }
  };

  const handleConfirmReview = () => {
    if (isCartTotalEstimated) {
      void handlePlaceQuoteOrder();
    } else {
      void handleConfirmPayment();
    }
  };

  return (
    <>
      {isProcessing ? (
        <div
          className="fixed inset-0 z-[100] flex cursor-wait items-center justify-center bg-black/55 backdrop-blur-[2px]"
          aria-busy="true"
          aria-live="polite"
          role="alertdialog"
          aria-label={isCheckingOut ? "Preparing checkout" : "Placing catering order"}
        >
          <div className="mx-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/90 px-6 py-4 shadow-2xl">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-400" />
            <p className="text-sm font-semibold text-white">
              {isCheckingOut
                ? "Preparing secure checkout…"
                : "Submitting your catering order…"}
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
                if (!isProcessing) {
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
                  storeLocations={storeLocations}
                  deliveryCities={deliveryCities}
                  selfDeliveryFee={selfDeliveryFee}
                  selfDeliveryOrigin={selfDeliveryOrigin}
                  isCartTotalEstimated={isCartTotalEstimated}
                  isCheckingOut={isCheckingOut}
                  onReviewChange={setOrderReview}
                  onBack={() => setCartView("cart")}
                  onConfirm={() => void handleConfirmReview()}
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
                          disabled={isProcessing}
                          className="text-xs text-white/30 transition-colors hover:text-red-400 disabled:pointer-events-none disabled:opacity-40"
                        >
                          Clear all
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={closeCart}
                        disabled={isProcessing}
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
                              {item.customisation ? (
                                <CustomisationSummary
                                  customisation={item.customisation}
                                />
                              ) : null}
                              <p className="mt-0.5 text-xs text-white/40">
                                {formatAud(cateringCartLineUnitPrice(item))} each
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-bold text-white">
                                {formatAud(
                                  cateringCartLineUnitPrice(item) * item.qty,
                                )}
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
                          {formatAud(cartTotal)}
                          {isCartTotalEstimated ? (
                            <span className="text-sm font-semibold text-white/60">
                              {" "}
                              est
                            </span>
                          ) : null}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleBeginReview}
                        disabled={isProcessing || isRateLimited}
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
