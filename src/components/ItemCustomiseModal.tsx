"use client";

import AppImage from "@/components/AppImage";
import { MenuItem } from "@/contexts/CartContext";
import { useOptionGroupsForItem } from "@/lib/item-customise-options";
import {
  computeExtraPrice,
  initialSelections,
  isSpiceGroupKey,
  isVeggieGroupKey,
  type ItemCustomisation,
} from "@/lib/product-customizations";
import {
  X,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Flame,
  Leaf,
  ShoppingCart,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useMemo, useState } from "react";

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

export function ItemCustomiseModal({ item, onConfirm, onClose }: Props) {
  const t = useTranslations("ItemCustomiseModal");
  const groups = useOptionGroupsForItem(item);

  const [selections, setSelections] = useState<Record<string, string[]>>(() =>
    initialSelections(groups),
  );

  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      const init: Record<string, boolean> = {};
      groups.forEach((group) => {
        init[group.id] = true;
      });
      return init;
    },
  );

  const toggleGroup = (id: string) =>
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleOption = (
    groupId: string,
    optionId: string,
    type: "single" | "multi",
  ) => {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      if (type === "single") {
        return {
          ...prev,
          [groupId]: current.includes(optionId) ? [] : [optionId],
        };
      }
      return {
        ...prev,
        [groupId]: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  };

  const extraPrice = useMemo(
    () => computeExtraPrice(groups, selections),
    [selections, groups],
  );

  const basePrice = parseFloat(item.price);
  const lineTotal = (basePrice + extraPrice) * qty;

  const handleConfirm = () => onConfirm({ selections, qty, note, extraPrice });

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

      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
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

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="border border-gray-100 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isSpiceGroupKey(group.id) && (
                    <Flame className="w-4 h-4 text-red-500" />
                  )}
                  {isVeggieGroupKey(group.id) && (
                    <Leaf className="w-4 h-4 text-green-500" />
                  )}
                  <span className="font-semibold text-gray-800 text-sm">
                    {group.title}
                  </span>
                  {group.required && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                      {t("requiredBadge")}
                    </span>
                  )}
                  {group.type === "multi" && (
                    <span className="text-xs text-gray-400">
                      {t("chooseAny")}
                    </span>
                  )}
                </div>
                {expandedGroups[group.id] ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {expandedGroups[group.id] && (
                <div className="divide-y divide-gray-50">
                  {group.options.map((opt) => {
                    const selected = (selections[group.id] ?? []).includes(
                      opt.id,
                    );
                    return (
                      <button
                        key={opt.id}
                        onClick={() =>
                          toggleOption(group.id, opt.id, group.type)
                        }
                        className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${
                          selected ? "bg-red-50" : "bg-white hover:bg-gray-50"
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
          ))}

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

        <div className="border-t border-gray-100 p-4 bg-white sticky bottom-0">
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
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-between bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-full px-5 py-3 font-semibold transition-colors"
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
