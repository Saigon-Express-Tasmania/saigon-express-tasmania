import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  fetchOrderByTrackingToken,
  formatTrackedOrderId,
  getOrderTrackingNotFoundRedirect,
  parseTrackingTokenFromParam,
} from "@/lib/supabase/order-tracking";
import { resolveTrackedOrderPickupStore } from "@/lib/supabase/order-tracking-pickup-store";
import OrderTrackingDetails from "@/views/OrderTrackingDetails";

type PageProps = {
  params: Promise<{ token: string }>;
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

export default async function OrderTrackingDetailsPage({ params }: PageProps) {
  const { token } = await params;
  const trackingToken = parseTrackingTokenFromParam(token);
  const order = trackingToken
    ? await fetchOrderByTrackingToken(trackingToken)
    : null;

  if (!order) {
    redirect(getOrderTrackingNotFoundRedirect());
  }

  const pickupStore = await resolveTrackedOrderPickupStore(order);

  return <OrderTrackingDetails order={order} pickupStore={pickupStore} />;
}
