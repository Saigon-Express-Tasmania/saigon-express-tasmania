"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatCateringDisplayPrice } from "@/lib/catering-price";
import type { CateringTierPrice } from "@/lib/supabase/catering-packs";
import { cn } from "@/lib/utils";

type CateringTierSelectProps = {
  id?: string;
  tiers: CateringTierPrice[];
  value: number;
  onValueChange: (index: number) => void;
  label?: string;
  variant?: "light" | "dark";
};

const variantStyles = {
  light: {
    label: "text-brand-dark/45",
    trigger:
      "h-11 rounded-lg border-brand-dark/15 bg-white text-brand-dark shadow-xs hover:border-brand-dark/25 focus-visible:border-brand-red focus-visible:ring-brand-red/20 data-[placeholder]:text-brand-dark/45 [&>svg]:text-brand-dark/50",
    content: "border-brand-dark/10 bg-white text-brand-dark shadow-lg",
    item: "py-2.5",
    optionMeta: "text-brand-dark/50 group-data-[state=checked]:text-brand-red/80",
    optionSize: "font-medium text-brand-dark group-data-[state=checked]:text-brand-red",
  },
  dark: {
    label: "text-white/40",
    trigger:
      "h-11 rounded-xl border-white/15 bg-white/8 text-white shadow-none hover:border-white/25 focus-visible:border-primary/60 focus-visible:ring-primary/40 data-[placeholder]:text-white/45 [&>svg]:text-white/50",
    content:
      "border-white/15 bg-neutral-950 text-white shadow-xl backdrop-blur-md",
    item: "py-2.5 text-white/90 focus:bg-primary/15 focus:text-white data-[highlighted]:bg-primary/15 data-[highlighted]:text-white data-[state=checked]:bg-primary/10 data-[state=checked]:text-white",
    optionMeta: "text-white/45 group-data-[state=checked]:text-primary/90",
    optionSize: "font-medium text-white group-data-[state=checked]:text-white",
  },
} as const;

export default function CateringTierSelect({
  id,
  tiers,
  value,
  onValueChange,
  label = "Size",
  variant = "light",
}: CateringTierSelectProps) {
  const styles = variantStyles[variant];

  if (tiers.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wide",
          styles.label,
        )}
      >
        {label}
      </Label>
      <Select
        value={String(value)}
        onValueChange={(next) => onValueChange(Number(next))}
      >
        <SelectTrigger id={id} className={styles.trigger}>
          <SelectValue placeholder="Choose a size" />
        </SelectTrigger>
        <SelectContent className={styles.content}>
          {tiers.map((tier, index) => (
            <SelectItem
              key={`${tier.size}-${index}`}
              value={String(index)}
              className={styles.item}
            >
              <span className="flex w-full min-w-0 items-center justify-between gap-3">
                <span className={cn("truncate", styles.optionSize)}>
                  {tier.size}
                </span>
                <span className={cn("shrink-0 text-xs", styles.optionMeta)}>
                  {formatCateringDisplayPrice(tier.price) ?? tier.price} · {tier.serves}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
