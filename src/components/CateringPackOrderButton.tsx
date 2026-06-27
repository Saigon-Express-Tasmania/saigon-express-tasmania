import { Plus } from "lucide-react";
import { formatAud, parseCateringPrice } from "@/lib/catering-price";
import type {
  CateringPack,
  CateringTierPrice,
} from "@/lib/supabase/catering-packs";

type CateringPackOrderButtonProps = {
  pack: CateringPack;
  selectedTier: CateringTierPrice | null;
  onAdd: () => void;
  orderLabel: string;
  quoteLabel: string;
  disabled?: boolean;
};

function resolveOrderButtonPriceLabel(
  pack: CateringPack,
  selectedTier: CateringTierPrice | null,
  unitPrice: number,
): string {
  return (
    selectedTier?.price?.trim() ||
    pack.price?.trim() ||
    formatAud(unitPrice)
  );
}

export default function CateringPackOrderButton({
  pack,
  selectedTier,
  onAdd,
  orderLabel,
  quoteLabel,
  disabled = false,
}: CateringPackOrderButtonProps) {
  const unitPrice =
    selectedTier != null
      ? parseCateringPrice(selectedTier.price)
      : parseCateringPrice(pack.price);

  if (unitPrice == null) {
    return <p className="text-xs text-brand-dark/45">{quoteLabel}</p>;
  }

  const priceLabel = resolveOrderButtonPriceLabel(pack, selectedTier, unitPrice);

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 bg-brand-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-red/90 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
    >
      <Plus size={14} className="shrink-0" />
      <span>
        {orderLabel}
        <span className="font-bold"> · {priceLabel}</span>
      </span>
    </button>
  );
}
