"use client";

import WholesaleCartItemThumbnail from "@/components/WholesaleCartItemThumbnail";
import CustomisationSummary from "@/components/CustomisationSummary";
import type { CateringCartItem } from "@/contexts/CateringCartContext";
import { Minus, Plus, Trash2 } from "lucide-react";

type CateringCartLineItemProps = {
  item: CateringCartItem;
  lineTotal: string;
  unitPriceLabel: string;
  interactive?: boolean;
  onRemove?: () => void;
  onUpdateQty?: (delta: number) => void;
};

export default function CateringCartLineItem({
  item,
  lineTotal,
  unitPriceLabel,
  interactive = false,
  onRemove,
  onUpdateQty,
}: CateringCartLineItemProps) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <WholesaleCartItemThumbnail
          imageUrl={item.imageUrl}
          alt={item.productName}
          size="sm"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug text-white">
              {item.productName}
            </p>
            <p className="shrink-0 text-sm font-bold tabular-nums text-white">
              {lineTotal}
            </p>
          </div>

          {item.variantLabel ? (
            <p className="mt-0.5 text-[11px] text-white/40">{item.variantLabel}</p>
          ) : null}

          {item.customisation ? (
            <CustomisationSummary
              customisation={item.customisation}
              compact
              className="mt-1"
            />
          ) : null}

          <p className="mt-1 text-[11px] text-white/35">{unitPriceLabel}</p>
        </div>

        {interactive && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="-mt-0.5 shrink-0 text-white/30 transition-colors hover:text-red-400"
            aria-label={`Remove ${item.productName}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {interactive && onUpdateQty ? (
        <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-white/5 pt-2">
          <button
            type="button"
            onClick={() => onUpdateQty(-1)}
            disabled={item.qty <= 1}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-white disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="min-w-[1.5rem] text-center text-xs font-bold tabular-nums text-white">
            {item.qty}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQty(1)}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-white"
            aria-label="Increase quantity"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      ) : null}
    </article>
  );
}
