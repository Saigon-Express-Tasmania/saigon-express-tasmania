"use client";

import AppImage from "@/components/AppImage";
import { MenuItem } from "@/contexts/CartContext";
import { useOptionGroupsForItem } from "@/lib/item-customise-options";
import {
  buildCustomisationGroups,
  computeExtraPrice,
  getEffectiveMaxOptions,
  getEffectiveMinOptions,
  getMissingRequiredOptionGroups,
  initialSelections,
  isOptionSelectionDisabled,
  isSpiceGroupKey,
  isVeggieGroupKey,
  toggleOptionSelection,
  type ItemCustomisation,
  type OptionGroup,
} from "@/lib/product-customizations";
import {
  X,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  MessageSquare,
  Flame,
  Leaf,
  ShoppingCart,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";

export type {
  CustomOption,
  ItemCustomisation,
  OptionGroup,
} from "@/lib/product-customizations";

interface Props {
  item: MenuItem;
  onConfirm: (customisation: ItemCustomisation) => void;
  onClose: () => void;
}

function initialExpandedGroups(groups: OptionGroup[]): Record<string, boolean> {
  const init: Record<string, boolean> = {};
  groups.forEach((group) => {
    init[group.id] = true;
  });
  return init;
}

function selectedOptionLabels(group: OptionGroup, ids: string[]): string {
  return ids
    .map((id) => group.options.find((option) => option.id === id)?.label)
    .filter((label): label is string => Boolean(label))
    .join(" · ");
}

export function ItemCustomiseModal({ item, onConfirm, onClose }: Props) {
  const t = useTranslations("ItemCustomiseModal");
  const groups = useOptionGroupsForItem(item);

  const [selections, setSelections] = useState<Record<string, string[]>>(() =>
    initialSelections(groups),
  );

  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => initialExpandedGroups(groups),
  );
  const [showMissingRequiredHint, setShowMissingRequiredHint] = useState(false);

  const toggleGroup = (id: string) =>
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleOption = (
    groupId: string,
    optionId: string,
    type: "single" | "multi",
  ) => {
    setSelections((prev) => {
      const group = groups.find((entry) => entry.id === groupId);
      if (!group) return prev;
      const current = prev[groupId] ?? [];
      const nextIds = toggleOptionSelection(group, current, optionId);

      if (type === "single" && nextIds.length > 0) {
        setExpandedGroups((expanded) => ({ ...expanded, [groupId]: false }));
      }

      return { ...prev, [groupId]: nextIds };
    });
  };

  const extraPrice = useMemo(
    () => computeExtraPrice(groups, selections),
    [selections, groups],
  );

  const missingRequiredGroups = useMemo(
    () => getMissingRequiredOptionGroups(groups, selections),
    [groups, selections],
  );

  const canAddToCart = missingRequiredGroups.length === 0;

  useLayoutEffect(() => {
    if (canAddToCart) {
      setShowMissingRequiredHint(false);
    }
  }, [canAddToCart]);

  const isGroupFulfilled = (group: OptionGroup) => {
    const count = (selections[group.id] ?? []).length;
    return count >= getEffectiveMinOptions(group);
  };

  const multiSelectionHint = (group: OptionGroup): string | null => {
    if (group.type !== "multi") return null;
    const min = getEffectiveMinOptions(group);
    const max = getEffectiveMaxOptions(group);
    if (min > 0 && max != null) {
      return t("chooseRange", { min, max });
    }
    if (min > 1) {
      return t("chooseAtLeast", { min });
    }
    if (max != null) {
      return t("chooseUpTo", { max });
    }
    return t("chooseAny");
  };

  const basePrice = parseFloat(item.price);
  const lineTotal = (basePrice + extraPrice) * qty;

  const panelRef = useRef<HTMLDivElement>(null);
  const heightLockedRef = useRef(false);
  const [lockedPanelHeight, setLockedPanelHeight] = useState<number>();

  useLayoutEffect(() => {
    if (heightLockedRef.current) return;
    const panel = panelRef.current;
    if (!panel) return;
    heightLockedRef.current = true;
    setLockedPanelHeight(panel.offsetHeight);
  }, []);

  const handleConfirm = () => {
    if (!canAddToCart) {
      setShowMissingRequiredHint(true);
      setExpandedGroups((prev) => {
        const next = { ...prev };
        for (const group of missingRequiredGroups) {
          next[group.id] = true;
        }
        return next;
      });
      return;
    }
    onConfirm({
      selections,
      groups: buildCustomisationGroups(groups, selections),
      qty,
      note,
      extraPrice,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        style={
          lockedPanelHeight != null ? { height: lockedPanelHeight } : undefined
        }
      >
        <div className="flex items-start gap-3 p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          {item.imageUrl && (
            <AppImage
              src={item.imageUrl}
              alt={item.name}
              width={64}
              height={64}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-lg leading-tight">
              {item.name}
            </h2>
            {item.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                {item.description}
              </p>
            )}
            <p className="text-red-600 font-semibold mt-1">
              ${basePrice.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {groups.map((group) => {
            const selectedIds = selections[group.id] ?? [];
            const selectedSummary = selectedOptionLabels(group, selectedIds);
            const fulfilled = isGroupFulfilled(group);
            const isExpanded = expandedGroups[group.id];
            const selectionHint = multiSelectionHint(group);
            return (
            <div
              key={group.id}
              className={`border rounded-xl overflow-hidden transition-colors ${
                group.required || (group.isMultiLimited && getEffectiveMinOptions(group) > 0)
                  ? fulfilled
                    ? "border-green-300 bg-green-50/40"
                    : "border-red-200 bg-red-50/30"
                  : "border-gray-100"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-start justify-between gap-3 px-4 py-3 transition-colors text-left ${
                  group.required || (group.isMultiLimited && getEffectiveMinOptions(group) > 0)
                    ? fulfilled
                      ? "bg-green-50 hover:bg-green-100/80"
                      : "bg-red-50 hover:bg-red-100/70"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isSpiceGroupKey(group.id) && (
                      <Flame className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    {isVeggieGroupKey(group.id) && (
                      <Leaf className="w-4 h-4 text-green-500 shrink-0" />
                    )}
                    <span className="font-semibold text-gray-800 text-sm">
                      {group.title}
                    </span>
                    {group.required &&
                      (fulfilled ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t("requiredBadgeFulfilled")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-semibold shadow-sm">
                          {t("requiredBadge")}
                        </span>
                      ))}
                    {group.type === "multi" && selectionHint ? (
                      <span className="text-xs text-gray-400">
                        {selectionHint}
                      </span>
                    ) : null}
                  </div>
                  {!isExpanded && selectedSummary ? (
                    <p className="mt-1 text-sm font-medium text-gray-700 leading-snug">
                      {selectedSummary}
                    </p>
                  ) : null}
                  {!isExpanded && !selectedSummary && (group.required || getEffectiveMinOptions(group) > 0) ? (
                    <p className="mt-1 text-sm text-gray-400">
                      {t("tapToChoose")}
                    </p>
                  ) : null}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                )}
              </button>

              {isExpanded && (
                <div className="divide-y divide-gray-50">
                  {group.options.map((opt) => {
                    const selected = (selections[group.id] ?? []).includes(
                      opt.id,
                    );
                    const disabled = isOptionSelectionDisabled(
                      group,
                      opt.id,
                      selectedIds,
                    );
                    return (
                      <button
                        key={opt.id}
                        onClick={() =>
                          toggleOption(group.id, opt.id, group.type)
                        }
                        disabled={disabled}
                        className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${
                          disabled
                            ? "cursor-not-allowed bg-gray-50 opacity-50"
                            : selected
                              ? "bg-red-50"
                              : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-${group.type === "single" ? "full" : "md"} border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                              selected
                                ? "border-red-600 bg-red-600"
                                : "border-gray-300"
                            }`}
                          >
                            {selected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-sm ${selected ? "text-gray-900 font-medium" : "text-gray-700"}`}
                          >
                            {opt.label}
                          </span>
                        </div>
                        {opt.price > 0 && (
                          <span
                            className={`text-sm font-medium flex-shrink-0 ml-2 ${selected ? "text-red-600" : "text-gray-500"}`}
                          >
                            +${opt.price.toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
          })}

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-800 text-sm">
                {t("specialInstructions.title")}
              </span>
              <span className="text-xs text-gray-400">
                {t("specialInstructions.optional")}
              </span>
            </div>
            <div className="p-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("specialInstructions.placeholder")}
                rows={3}
                maxLength={200}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400"
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {t("specialInstructions.charCount", { count: note.length })}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 p-4 bg-white sticky bottom-0 space-y-3">
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

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-1 py-1">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Minus className="w-4 h-4 text-gray-700" />
              </button>
              <span className="w-6 text-center font-bold text-gray-900">
                {qty}
              </span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              className={`flex-1 flex items-center justify-between rounded-full px-5 py-3 font-semibold transition-colors ${
                canAddToCart
                  ? "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white"
                  : "border-2 border-red-600 bg-transparent text-red-600 hover:bg-red-50 active:bg-red-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                <span>{t("addToCart")}</span>
              </div>
              <span>${lineTotal.toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
