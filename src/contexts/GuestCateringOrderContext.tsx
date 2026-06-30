"use client";

import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  GUEST_CATERING_ORDER_STORAGE_KEY,
  isGuestCateringOrderTrackable,
  shouldBlockGuestCateringCart,
  type GuestCateringOrderSession,
} from "@/lib/guest-catering-order-session";
import { useCateringCart } from "@/contexts/CateringCartContext";
import { isPublicCateringShopRoute } from "@/lib/catering-routes";
import { clearCateringOrderRateLimit } from "@/lib/catering-order-rate-limit";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import {
  fetchOrderByTrackingToken,
  type TrackedOrder,
} from "@/lib/supabase/order-tracking";
import { toast } from "sonner";

type GuestOrderStore = {
  session: GuestCateringOrderSession | null;
  setSession: (session: GuestCateringOrderSession) => void;
  clearSession: () => void;
};

const useGuestOrderStore = create<GuestOrderStore>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: GUEST_CATERING_ORDER_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session }),
    },
  ),
);

type GuestCateringOrderContextValue = {
  session: GuestCateringOrderSession | null;
  trackedOrder: TrackedOrder | null;
  isHydrated: boolean;
  isLoadingOrder: boolean;
  lastOrderOpen: boolean;
  hasActiveGuestOrder: boolean;
  setLastOrderOpen: (open: boolean) => void;
  saveGuestOrder: (session: GuestCateringOrderSession) => void;
  clearGuestOrder: () => void;
  refreshTrackedOrder: () => Promise<TrackedOrder | null>;
};

const GuestCateringOrderContext =
  createContext<GuestCateringOrderContextValue | null>(null);

type RefreshTrackedOrderOptions = {
  clearIfMissing?: boolean;
};

async function fetchTrackedOrderWithRetry(
  trackingToken: string,
  maxAttempts = 1,
): Promise<TrackedOrder | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const order = await fetchOrderByTrackingToken(trackingToken);
    if (order) return order;
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 300 * (attempt + 1));
      });
    }
  }
  return null;
}

function isCateringRoute(pathname: string): boolean {
  return isPublicCateringShopRoute(pathname);
}

function GuestCateringOrderCheckoutSync() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const { clearGuestOrder, setLastOrderOpen } = useGuestCateringOrder();
  const { clearCart } = useCateringCart();
  const handledCheckoutRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isCateringRoute(pathname)) return;

    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    const sessionId = searchParams.get("sessionId")?.trim() ?? "";
    const key = `${checkout}:${sessionId}`;
    if (handledCheckoutRef.current === key) return;
    handledCheckoutRef.current = key;

    if (checkout === "success") {
      clearCateringOrderRateLimit();
      clearGuestOrder();
      clearCart();

      if (!sessionId) {
        toast.success("Payment successful. Your catering order is confirmed.");
        router.replace(pathname, { scroll: false });
        return;
      }

      let cancelled = false;
      let attempts = 0;
      const maxAttempts = 12;

      const pollTrackingToken = async () => {
        try {
          const result = await invokeEdgeFunction<{
            trackingToken?: string | null;
            invoiceNumber?: string | null;
          }>("order-tracking-token", {
            method: "GET",
            searchParams: { sessionId },
          });

          if (cancelled) return;

          const trackingToken = result.data?.trackingToken?.trim();
          if (result.ok && trackingToken) {
            toast.success("Payment successful. Opening your order…");
            router.replace(
              `/order-tracking/${encodeURIComponent(trackingToken)}?checkout=success`,
              { scroll: false },
            );
            return;
          }
        } catch {
          // retry below
        }

        attempts += 1;
        if (!cancelled && attempts < maxAttempts) {
          window.setTimeout(() => {
            void pollTrackingToken();
          }, 2500);
          return;
        }

        if (!cancelled) {
          toast.success("Payment successful. Your catering order is confirmed.");
          router.replace(pathname, { scroll: false });
        }
      };

      void pollTrackingToken();

      return () => {
        cancelled = true;
      };
    }

    if (checkout === "cancelled") {
      toast.error("Payment was cancelled. You can try again when ready.");
      setLastOrderOpen(true);
    }

    router.replace(pathname, { scroll: false });
  }, [clearCart, clearGuestOrder, pathname, router, searchParams, setLastOrderOpen]);

  return null;
}

export function GuestCateringOrderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = useGuestOrderStore((state) => state.session);
  const setSession = useGuestOrderStore((state) => state.setSession);
  const clearSession = useGuestOrderStore((state) => state.clearSession);
  const [isHydrated, setIsHydrated] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [lastOrderOpen, setLastOrderOpen] = useState(false);
  const skipNextSessionRefreshRef = useRef(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const clearGuestOrder = useCallback(() => {
    clearSession();
    setTrackedOrder(null);
    setLastOrderOpen(false);
  }, [clearSession]);

  const loadTrackedOrder = useCallback(
    async (
      trackingToken: string,
      options: RefreshTrackedOrderOptions = {},
    ): Promise<TrackedOrder | null> => {
      const token = trackingToken.trim();
      if (!token) {
        setTrackedOrder(null);
        return null;
      }

      const clearIfMissing = options.clearIfMissing ?? true;
      const maxAttempts = clearIfMissing ? 1 : 4;

      setIsLoadingOrder(true);
      try {
        const order = await fetchTrackedOrderWithRetry(token, maxAttempts);
        if (!order) {
          if (clearIfMissing) {
            clearGuestOrder();
          } else {
            setTrackedOrder(null);
          }
          return null;
        }

        if (!isGuestCateringOrderTrackable(order.status)) {
          clearGuestOrder();
          return null;
        }

        setTrackedOrder(order);
        return order;
      } catch {
        return null;
      } finally {
        setIsLoadingOrder(false);
      }
    },
    [clearGuestOrder],
  );

  const refreshTrackedOrder = useCallback(
    async (): Promise<TrackedOrder | null> => {
      return loadTrackedOrder(session?.trackingToken ?? "", {
        clearIfMissing: true,
      });
    },
    [loadTrackedOrder, session?.trackingToken],
  );

  useEffect(() => {
    if (!isHydrated) return;
    if (!session?.trackingToken) {
      setTrackedOrder(null);
      return;
    }
    if (skipNextSessionRefreshRef.current) {
      skipNextSessionRefreshRef.current = false;
      return;
    }
    void loadTrackedOrder(session.trackingToken, { clearIfMissing: true });
  }, [isHydrated, loadTrackedOrder, session?.trackingToken]);

  const saveGuestOrder = useCallback(
    (next: GuestCateringOrderSession) => {
      skipNextSessionRefreshRef.current = true;
      setSession(next);
      setLastOrderOpen(true);
      void loadTrackedOrder(next.trackingToken, { clearIfMissing: false });
    },
    [loadTrackedOrder, setSession],
  );

  const hasActiveGuestOrder = shouldBlockGuestCateringCart(
    session,
    trackedOrder,
    false,
  );

  const value = useMemo<GuestCateringOrderContextValue>(
    () => ({
      session,
      trackedOrder,
      isHydrated,
      isLoadingOrder,
      lastOrderOpen,
      hasActiveGuestOrder,
      setLastOrderOpen,
      saveGuestOrder,
      clearGuestOrder,
      refreshTrackedOrder,
    }),
    [
      session,
      trackedOrder,
      isHydrated,
      isLoadingOrder,
      lastOrderOpen,
      hasActiveGuestOrder,
      saveGuestOrder,
      clearGuestOrder,
      refreshTrackedOrder,
    ],
  );

  return (
    <GuestCateringOrderContext.Provider value={value}>
      <Suspense fallback={null}>
        <GuestCateringOrderCheckoutSync />
      </Suspense>
      {children}
    </GuestCateringOrderContext.Provider>
  );
}

export function useGuestCateringOrder(): GuestCateringOrderContextValue {
  const context = useContext(GuestCateringOrderContext);
  if (!context) {
    throw new Error(
      "useGuestCateringOrder must be used within GuestCateringOrderProvider",
    );
  }
  return context;
}
