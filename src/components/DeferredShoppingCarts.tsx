"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCateringCart } from "@/contexts/CateringCartContext";
import { useCommerceCartConfig } from "@/contexts/CommerceCartConfigContext";
import { useWholesaleCart } from "@/contexts/WholesaleCartContext";
import {
  isCateringCartRoute,
  isWholesaleCartRoute,
} from "@/lib/commerce-cart-routes";
import type { StoreLocation } from "@/types";

const WholesaleShoppingCart = dynamic(
  () => import("@/components/WholesaleShoppingCart"),
);

const CateringShoppingCart = dynamic(
  () => import("@/components/CateringShoppingCart"),
);

type DeferredShoppingCartsProps = {
  storeLocations: StoreLocation[];
};

export default function DeferredShoppingCarts({
  storeLocations,
}: DeferredShoppingCartsProps) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname() ?? "/";
  const { cartOpen: wholesaleCartOpen } = useWholesaleCart();
  const { cartOpen: cateringCartOpen } = useCateringCart();
  const {
    deliveryCities,
    selfDeliveryFee,
    selfDeliveryOrigin,
    isLoaded,
    ensureLoaded,
  } = useCommerceCartConfig();

  const loadWholesale =
    isWholesaleCartRoute(pathname) || wholesaleCartOpen;
  const loadCatering = isCateringCartRoute(pathname) || cateringCartOpen;
  const shouldLoadConfig = loadWholesale || loadCatering;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!shouldLoadConfig) return;
    void ensureLoaded();
  }, [shouldLoadConfig, ensureLoaded]);

  if (!mounted || !shouldLoadConfig || !isLoaded) {
    return null;
  }

  const cartProps = {
    storeLocations,
    deliveryCities,
    selfDeliveryFee,
    selfDeliveryOrigin,
  };

  return (
    <>
      {loadWholesale ? <WholesaleShoppingCart {...cartProps} /> : null}
      {loadCatering ? <CateringShoppingCart {...cartProps} /> : null}
    </>
  );
}
