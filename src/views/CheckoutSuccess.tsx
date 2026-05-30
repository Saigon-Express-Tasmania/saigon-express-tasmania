"use client";

import { useEffect, useState } from "react";
import Link from "@/components/link";
import AppImage from "@/components/AppImage";
import { CheckCircle, ShoppingCart, MapPin, Navigation } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";

const LOGO_URL = "/manus-storage/saigonexpresslogo_clean_719f26ac.png";

type CheckoutSuccessProps = {
  orderId: number | null;
};

export default function CheckoutSuccess({ orderId }: CheckoutSuccessProps) {
  const { clearCart } = useCart();
  const [trackingToken, setTrackingToken] = useState<string | null>(null);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12;

    async function poll() {
      try {
        const result = await invokeEdgeFunction<{ trackingToken?: string | null }>(
          "order-tracking-token",
          {
            method: "GET",
            searchParams: { orderId: String(orderId) },
          },
        );
        if (!result.ok) return;
        if (result.data.trackingToken) {
          if (!cancelled) setTrackingToken(result.data.trackingToken);
          return;
        }
      } catch {
        // retry
      }

      attempts += 1;
      if (!cancelled && attempts < maxAttempts) {
        setTimeout(poll, 2500);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const trackingUrl = trackingToken ? `/order-tracking/${trackingToken}` : null;

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <AppImage
              src={LOGO_URL}
              alt="Saigon Express Tasmania"
              width={180}
              height={40}
              priority
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-green-600" />
          </div>
          <h1 className="font-serif text-3xl text-brand-dark mb-3">Payment Confirmed!</h1>
          {orderId && (
            <p className="text-brand-dark/60 mb-2">
              Order <strong>#{orderId}</strong> has been placed successfully.
            </p>
          )}
          <p className="text-brand-dark/60 mb-6">
            We&apos;ve received your payment and your order is being prepared. You&apos;ll receive a
            confirmation email with a tracking link shortly.
          </p>

          {trackingUrl && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-gray-600 mb-3">Watch your order progress in real time:</p>
              <Link
                href={trackingUrl}
                className="inline-flex items-center justify-center gap-2 bg-brand-red text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-brand-red/90 transition-colors w-full"
              >
                <Navigation size={16} /> Track Your Order Live
              </Link>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/menu"
              className="inline-flex items-center justify-center gap-2 bg-brand-red text-white px-6 py-3 font-semibold text-sm hover:bg-brand-red/90 transition-colors"
            >
              <ShoppingCart size={16} /> Order More
            </Link>
            <Link
              href="/stores"
              className="inline-flex items-center justify-center gap-2 border border-brand-red text-brand-red px-6 py-3 font-semibold text-sm hover:bg-brand-red/5 transition-colors"
            >
              <MapPin size={16} /> Find Your Store
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
