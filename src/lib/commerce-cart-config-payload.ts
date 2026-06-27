import type { SelfDeliveryFee } from "@/lib/self-delivery-fee";
import type { WholesaleCartConfig } from "@/lib/wholesale-page";
import type { DeliveryCity } from "@/types";

export type CommerceCartConfigPayload = {
  deliveryCities: DeliveryCity[];
  wholesaleCartConfig: WholesaleCartConfig;
  selfDeliveryFee: SelfDeliveryFee;
  selfDeliveryOrigin: string;
};
