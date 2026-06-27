import { SHORT_REVALIDATE_SECONDS } from "@/config/settings";
import type { CommerceCartConfigPayload } from "@/lib/commerce-cart-config-payload";
import { getDeliveryCities } from "@/lib/supabase/delivery-cities";
import { getSelfDeliveryFee, getSelfDeliveryOrigin } from "@/lib/supabase/settings";
import { loadWholesaleCartConfig } from "@/lib/wholesale-page";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [deliveryCities, wholesaleCartConfig, selfDeliveryFee, selfDeliveryOrigin] =
      await Promise.all([
        getDeliveryCities(),
        loadWholesaleCartConfig(),
        getSelfDeliveryFee(),
        getSelfDeliveryOrigin(),
      ]);

    const payload: CommerceCartConfigPayload = {
      deliveryCities,
      wholesaleCartConfig,
      selfDeliveryFee,
      selfDeliveryOrigin,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${SHORT_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load commerce cart config";
    console.error("[api/commerce-cart-config]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
