export {
  SELF_DELIVERY_FEE_KEY,
  DEFAULT_SELF_DELIVERY_FEE,
  clampStep,
  parseSelfDeliveryFee,
  serializeSelfDeliveryFee,
  estimateEfficiencyKmPerLiter,
  calculateSelfDeliveryFee,
  calculateSelfDeliveryFeeTotal,
  type SelfDeliveryFee,
  type SelfDeliveryFeeQuote,
} from "../../../../src/lib/self-delivery-fee";

export function formatAudAmount(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
