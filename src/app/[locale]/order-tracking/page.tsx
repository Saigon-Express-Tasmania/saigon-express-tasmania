import type { Metadata } from "next";
import OrderTrackingFront from "@/views/OrderTrackingFront";

export const metadata: Metadata = {
  title: "Track Your Order | Saigon Express Tasmania",
  description:
    "Enter your unique tracking token to view detailed order status.",
};

export default function LocaleOrderTrackingPage() {
  return <OrderTrackingFront />;
}
