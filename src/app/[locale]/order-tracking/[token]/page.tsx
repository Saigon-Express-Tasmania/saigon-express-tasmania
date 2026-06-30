import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  fetchOrderByTrackingToken,
  formatTrackedOrderId,
  getOrderTrackingNotFoundRedirect,
  parseTrackingTokenFromParam,
} from "@/lib/supabase/order-tracking";
import { resolveOrderTrackingStores } from "@/lib/supabase/order-tracking-stores";
import { getProductCustomizationsCatalog } from "@/lib/supabase/product-customizations";
import OrderTrackingDetails from "@/views/OrderTrackingDetails";

type PageProps = {
  params: Promise<{ locale: string; token: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const order = await fetchOrderByTrackingToken(parseTrackingTokenFromParam(token));

  if (!order) {
    return {
      title: "Track Your Order | Saigon Express Tasmania",
    };
  }

  return {
    title: `Track Order ${formatTrackedOrderId(order.id)} | Saigon Express Tasmania`,
    description: `Track the status of order ${formatTrackedOrderId(order.id)}.`,
  };
}

export default async function LocaleOrderTrackingDetailsPage({
  params,
}: PageProps) {
  const { locale, token } = await params;
  const trackingToken = parseTrackingTokenFromParam(token);
  const order = trackingToken
    ? await fetchOrderByTrackingToken(trackingToken)
    : null;

  if (!order) {
    redirect(getOrderTrackingNotFoundRedirect(locale));
  }

  const { pickupStore, invoiceCreatorStore } =
    await resolveOrderTrackingStores(order);
  const customizationsCatalog = await getProductCustomizationsCatalog();

  return (
    <Suspense fallback={null}>
      <OrderTrackingDetails
        order={order}
        trackingToken={trackingToken}
        pickupStore={pickupStore}
        invoiceCreatorStore={invoiceCreatorStore}
        customizationsCatalog={customizationsCatalog}
      />
    </Suspense>
  );
}
