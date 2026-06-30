"use client";

import type { MenuItem } from "@/contexts/CartContext";
import { useItemCustomisationState } from "@/lib/item-customise-options";
import {
  getMissingRequiredOptionGroups,
  isSpiceGroupKey,
  isVeggieGroupKey,
  type ItemCustomisation,
  type OptionGroup,
} from "@/lib/product-customizations";
import { formatAud } from "@/lib/catering-price";
import { cn } from "@/lib/utils";
import {
  Check,
  CheckCircle2,
  Flame,
  Leaf,
  MessageSquare,
  Plus,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

export const EMPTY_CUSTOMISE_MENU_ITEM: MenuItem = {
  id: 0,
  name: "",
  category: "",
  price: "0",
  description: "",
  imageUrl: "",
  isAvailable: true,
  energy: 0,
  customizationsDisabled: true,
};

type CustomisationState = ReturnType<typeof useItemCustomisationState>;

type ItemCustomiseInlineFieldsProps = {
  groups: OptionGroup[];
  selections: Record<string, string[]>;
  note: string;
  onNoteChange: (note: string) => void;
  onToggleOption: (
    groupId: string,
    optionId: string,
    type: "single" | "multi",
  ) => void;
  className?: string;
};

function getSelectedOptions(group: OptionGroup, ids: string[]) {
  return ids
    .map((id) => group.options.find((option) => option.id === id))
    .filter((option): option is NonNullable<typeof option> => option != null);
}

function selectedOptionChipClass(type: "single" | "multi"): string {
  return cn(
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
    type === "multi"
      ? "border border-emerald-200/90 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100"
      : "border border-green-200/90 bg-green-50 text-green-900 ring-1 ring-green-100",
  );
}

function inlineOptionButtonClass(
  selected: boolean,
  type: "single" | "multi",
): string {
  if (type === "single") {
    return cn(
      "inline-flex items-center rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
      selected
        ? "border-2 border-green-600 bg-green-600 text-white shadow-sm"
        : "border-2 border-green-600 bg-transparent text-green-700 hover:bg-green-50",
    );
  }

  return cn(
    "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
    selected
      ? "border-2 border-emerald-600 bg-emerald-600 text-white shadow-sm"
      : "border-2 border-dashed border-emerald-500/70 bg-transparent text-emerald-800 hover:border-emerald-600 hover:bg-emerald-50",
  );
}

function inlineOptionPriceClass(
  selected: boolean,
  type: "single" | "multi",
): string {
  if (type === "multi") {
    return cn(
      "font-semibold",
      selected ? "text-white/90" : "text-emerald-700/80",
    );
  }

  return cn(
    "ml-1.5 font-semibold",
    selected ? "text-white/90" : "text-green-700/80",
  );
}

export function ItemCustomiseInlineFields({
  groups,
  selections,
  note,
  onNoteChange,
  onToggleOption,
  className,
}: ItemCustomiseInlineFieldsProps) {
  const t = useTranslations("ItemCustomiseModal");

  if (groups.length === 0) return null;

  return (
    <section
      id="catering-item-customise-fields"
      className={cn("mb-6 space-y-5 border-t border-gray-200 pt-5", className)}
    >
      <h2 className="font-serif text-lg font-bold text-brand-dark">
        {t("customizeTitle")}
      </h2>

      {groups.map((group) => {
        const selectedIds = selections[group.id] ?? [];
        const selectedOptions = getSelectedOptions(group, selectedIds);
        const hasSelection = selectedOptions.length > 0;

        return (
          <div key={group.id} className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {isSpiceGroupKey(group.id) ? (
                <Flame className="h-4 w-4 shrink-0 text-brand-red" />
              ) : null}
              {isVeggieGroupKey(group.id) ? (
                <Leaf className="h-4 w-4 shrink-0 text-green-600" />
              ) : null}
              <span className="text-sm font-semibold text-brand-dark">
                {group.title}
              </span>
              {group.required && !hasSelection ? (
                <span className="rounded-full bg-brand-red px-2 py-0.5 text-xs font-semibold text-white">
                  {t("requiredBadge")}
                </span>
              ) : null}
              {hasSelection ? (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  {selectedOptions.map((option) => (
                    <span
                      key={option.id}
                      className={selectedOptionChipClass(group.type)}
                    >
                      <Check
                        className={cn(
                          "size-3 shrink-0 stroke-[2.5]",
                          group.type === "multi"
                            ? "text-emerald-600"
                            : "text-green-600",
                        )}
                        aria-hidden
                      />
                      <span>{option.label}</span>
                      {option.price > 0 ? (
                        <span className="font-medium opacity-75">
                          +${option.price.toFixed(2)}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </span>
              ) : group.type === "multi" ? (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
                  {t("chooseAny")}
                </span>
              ) : (
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">
                  {t("pickOne")}
                </span>
              )}
            </div>

            <div
              className={cn(
                "flex flex-wrap gap-2",
                group.type === "multi" ? "gap-2.5" : "gap-2",
              )}
            >
              {group.options.map((option) => {
                const selected = selectedIds.includes(option.id);
                const isMulti = group.type === "multi";
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      onToggleOption(group.id, option.id, group.type)
                    }
                    className={inlineOptionButtonClass(selected, group.type)}
                  >
                    {isMulti && selected ? (
                      <Check
                        className="size-4 shrink-0 stroke-[2.5]"
                        aria-hidden
                      />
                    ) : null}
                    <span>{option.label}</span>
                    {option.price > 0 ? (
                      <span
                        className={cn(
                          inlineOptionPriceClass(selected, group.type),
                          !isMulti && "ml-1.5",
                          isMulti && "ml-0.5",
                        )}
                      >
                        +${option.price.toFixed(2)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-brand-dark/50" />
          <span className="text-sm font-semibold text-brand-dark">
            {t("specialInstructions.title")}
          </span>
          <span className="text-xs text-brand-dark/45">
            {t("specialInstructions.optional")}
          </span>
        </div>
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={t("specialInstructions.placeholder")}
          rows={2}
          maxLength={200}
          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
        />
      </div>
    </section>
  );
}

type ItemCustomiseInlineAddSectionProps = {
  unitPrice: number;
  priceLabel: string;
  orderLabel: string;
  groups: OptionGroup[];
  selections: Record<string, string[]>;
  buildCustomisation: (qty: number) => ItemCustomisation;
  onAdd: (customisation: ItemCustomisation) => void;
  disabled?: boolean;
};

export function ItemCustomiseInlineAddSection({
  unitPrice,
  priceLabel,
  orderLabel,
  groups,
  selections,
  buildCustomisation,
  onAdd,
  disabled = false,
}: ItemCustomiseInlineAddSectionProps) {
  const t = useTranslations("ItemCustomiseModal");
  const [showMissingRequiredHint, setShowMissingRequiredHint] = useState(false);

  const missingRequiredGroups = useMemo(
    () => getMissingRequiredOptionGroups(groups, selections),
    [groups, selections],
  );

  const canAddToCart = missingRequiredGroups.length === 0;
  const extraPrice = buildCustomisation(1).extraPrice;
  const displayPrice =
    extraPrice > 0 ? `${priceLabel} (+${formatAud(extraPrice)})` : priceLabel;

  useEffect(() => {
    if (canAddToCart) {
      setShowMissingRequiredHint(false);
    }
  }, [canAddToCart]);

  const handleAdd = () => {
    if (disabled) return;

    if (!canAddToCart) {
      setShowMissingRequiredHint(true);
      document
        .getElementById("catering-item-customise-fields")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    onAdd(buildCustomisation(1));
  };

  return (
    <div className="space-y-3">
      {showMissingRequiredHint && missingRequiredGroups.length > 0 ? (
        <div
          className="relative rounded-xl border border-red-200 bg-red-50 px-4 py-3 pr-10 text-sm text-red-800"
          role="alert"
        >
          <button
            type="button"
            onClick={() => setShowMissingRequiredHint(false)}
            className="absolute right-2 top-2 rounded-full p-1 text-red-600/70 transition-colors hover:bg-red-100 hover:text-red-800"
            aria-label={t("dismissMissingRequired")}
          >
            <X className="h-4 w-4" />
          </button>
          <p className="font-semibold pr-4">{t("missingRequiredTitle")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {missingRequiredGroups.map((group) => (
              <li key={group.id}>{group.title}</li>
            ))}
          </ul>
        </div>
      ) : canAddToCart ? (
        <p
          className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-800"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t("readyToAdd")}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400",
          canAddToCart && !disabled
            ? "bg-brand-red text-white hover:bg-brand-red/90"
            : "border-2 border-brand-red bg-transparent text-brand-red hover:bg-brand-red/5",
        )}
      >
        <Plus size={14} className="shrink-0" />
        <span>
          {orderLabel}
          <span className="font-bold"> · {displayPrice}</span>
        </span>
      </button>
    </div>
  );
}

export function useCateringItemCustomisation(item: MenuItem) {
  return useItemCustomisationState(item);
}
