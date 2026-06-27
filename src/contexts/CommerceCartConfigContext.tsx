"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_COMMERCE_CART_CONFIG,
  fetchCommerceCartConfig,
} from "@/lib/commerce-cart-config-client";
import type { CommerceCartConfigPayload } from "@/lib/commerce-cart-config-payload";
import {
  isCateringCartRoute,
  isWholesaleCartRoute,
} from "@/lib/commerce-cart-routes";

type CommerceCartConfigState = CommerceCartConfigPayload & {
  isLoaded: boolean;
  isLoading: boolean;
  ensureLoaded: () => Promise<void>;
};

const CommerceCartConfigContext = createContext<CommerceCartConfigState>({
  ...DEFAULT_COMMERCE_CART_CONFIG,
  isLoaded: false,
  isLoading: false,
  ensureLoaded: async () => {},
});

function shouldPrefetchCommerceCartConfig(pathname: string): boolean {
  return isWholesaleCartRoute(pathname) || isCateringCartRoute(pathname);
}

export function CommerceCartConfigProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [config, setConfig] = useState<CommerceCartConfigPayload>(
    DEFAULT_COMMERCE_CART_CONFIG,
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  const loadConfig = useCallback(async () => {
    if (loadPromiseRef.current) {
      await loadPromiseRef.current;
      return;
    }

    loadPromiseRef.current = (async () => {
      setIsLoading(true);
      try {
        const payload = await fetchCommerceCartConfig();
        setConfig(payload);
        setIsLoaded(true);
      } catch (error) {
        console.error("[CommerceCartConfigProvider]", error);
        setIsLoaded(false);
        throw error;
      } finally {
        setIsLoading(false);
        loadPromiseRef.current = null;
      }
    })();

    await loadPromiseRef.current;
  }, []);

  const ensureLoaded = useCallback(async () => {
    if (isLoaded) return;
    await loadConfig();
  }, [isLoaded, loadConfig]);

  useEffect(() => {
    if (!shouldPrefetchCommerceCartConfig(pathname)) {
      return;
    }

    void loadConfig();
  }, [pathname, loadConfig]);

  const value = useMemo<CommerceCartConfigState>(
    () => ({
      ...config,
      isLoaded,
      isLoading,
      ensureLoaded,
    }),
    [config, isLoaded, isLoading, ensureLoaded],
  );

  return (
    <CommerceCartConfigContext.Provider value={value}>
      {children}
    </CommerceCartConfigContext.Provider>
  );
}

export function useCommerceCartConfig() {
  return useContext(CommerceCartConfigContext);
}
