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
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/config/localize";
import {
  GUEST_CATERING_ORDER_STORAGE_KEY,
  isGuestCateringOrderTrackable,
  shouldBlockGuestCateringCart,
  type GuestCateringOrderSession,
} from "@/lib/guest-catering-order-session";
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

function stripLocalePrefix(pathname: string): string {
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const prefix = `/${locale}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length) || "/";
    }
  }
  return pathname;
}

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
  const path = stripLocalePrefix(pathname.replace(/\/$/, "") || "/");
  return path === "/catering";
}

function GuestCateringOrderCheckoutSync() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const { clearGuestOrder, setLastOrderOpen } = useGuestCateringOrder();
  const handledCheckoutRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isCateringRoute(pathname)) return;

    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    const key = `${checkout}:${searchParams.get("sessionId") ?? ""}`;
    if (handledCheckoutRef.current === key) return;
    handledCheckoutRef.current = key;

    if (checkout === "success") {
      clearGuestOrder();
      toast.success("Payment successful. Your catering order is confirmed.");
    } else if (checkout === "cancelled") {
      toast.error("Payment was cancelled. You can try again when ready.");
      setLastOrderOpen(true);
    }

    router.replace(pathname, { scroll: false });
  }, [clearGuestOrder, pathname, router, searchParams, setLastOrderOpen]);

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
