export const SELF_DELIVERY_FEE_KEY = "self_delivery_fee";

export type SelfDeliveryFee = {
  gas_price: number;
  truck_engine_volume: number;
  maintenance_buffer: number;
  profit_margin: number;
};

export const DEFAULT_SELF_DELIVERY_FEE: SelfDeliveryFee = {
  gas_price: 1.9,
  truck_engine_volume: 3,
  maintenance_buffer: 20,
  profit_margin: 30,
};

export type SelfDeliveryFeeQuote = {
  oneWayDistanceKm: number;
  roundTripDistanceKm: number;
  efficiencyKmPerLiter: number;
  fuelCost: number;
  maintenanceCost: number;
  subtotalBeforeMargin: number;
  totalFee: number;
};

const MIN_EFFICIENCY_KM_PER_LITER = 1;

export function clampStep(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  const clamped = Math.min(max, Math.max(min, value));
  const steps = Math.round((clamped - min) / step);
  return Number((min + steps * step).toFixed(6));
}

export function parseSelfDeliveryFee(raw: string | undefined): SelfDeliveryFee {
  if (!raw?.trim()) {
    return { ...DEFAULT_SELF_DELIVERY_FEE };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SelfDeliveryFee>;
    return {
      gas_price:
        typeof parsed.gas_price === "number" && Number.isFinite(parsed.gas_price)
          ? parsed.gas_price
          : DEFAULT_SELF_DELIVERY_FEE.gas_price,
      truck_engine_volume:
        typeof parsed.truck_engine_volume === "number" &&
        Number.isFinite(parsed.truck_engine_volume)
          ? clampStep(parsed.truck_engine_volume, 1, 8, 0.5)
          : DEFAULT_SELF_DELIVERY_FEE.truck_engine_volume,
      maintenance_buffer:
        typeof parsed.maintenance_buffer === "number" &&
        Number.isFinite(parsed.maintenance_buffer)
          ? clampStep(parsed.maintenance_buffer, 0, 100, 1)
          : DEFAULT_SELF_DELIVERY_FEE.maintenance_buffer,
      profit_margin:
        typeof parsed.profit_margin === "number" &&
        Number.isFinite(parsed.profit_margin)
          ? clampStep(parsed.profit_margin, 0, 200, 1)
          : DEFAULT_SELF_DELIVERY_FEE.profit_margin,
    };
  } catch {
    return { ...DEFAULT_SELF_DELIVERY_FEE };
  }
}

export function estimateEfficiencyKmPerLiter(engineVolumeLiters: number): number {
  return Math.max(
    MIN_EFFICIENCY_KM_PER_LITER,
    16 - 1.8 * engineVolumeLiters,
  );
}

export function calculateSelfDeliveryFee(
  params: SelfDeliveryFee,
  oneWayDistanceKm: number,
): SelfDeliveryFeeQuote | null {
  if (!Number.isFinite(oneWayDistanceKm) || oneWayDistanceKm < 0) {
    return null;
  }

  const roundTripDistanceKm = oneWayDistanceKm * 2;
  const efficiencyKmPerLiter = estimateEfficiencyKmPerLiter(
    params.truck_engine_volume,
  );
  const fuelCost =
    (roundTripDistanceKm / efficiencyKmPerLiter) * params.gas_price;
  const maintenanceCost = fuelCost * (params.maintenance_buffer / 100);
  const subtotalBeforeMargin = fuelCost + maintenanceCost;
  const totalFee =
    subtotalBeforeMargin * (1 + params.profit_margin / 100);

  return {
    oneWayDistanceKm,
    roundTripDistanceKm,
    efficiencyKmPerLiter,
    fuelCost,
    maintenanceCost,
    subtotalBeforeMargin,
    totalFee,
  };
}

export function roundDeliveryFee(amount: number): number {
  return Number(amount.toFixed(2));
}

export function calculateSelfDeliveryFeeTotal(
  params: SelfDeliveryFee,
  oneWayDistanceKm: number,
): number {
  const quote = calculateSelfDeliveryFee(params, oneWayDistanceKm);
  return quote ? roundDeliveryFee(quote.totalFee) : 0;
}
