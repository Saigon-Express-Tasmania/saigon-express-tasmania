"use client";

import AppImage from "@/components/AppImage";
import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
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
import { MenuItem } from "@/contexts/CartContext";

// ─── Customisation types ──────────────────────────────────────────────────────

export type CustomOption = { id: string; label: string; price: number };

export type OptionGroup = {
  id: string;
  title: string;
  type: "single" | "multi";
  required?: boolean;
  options: CustomOption[];
};

export type ItemCustomisation = {
  selections: Record<string, string[]>;
  qty: number;
  note: string;
  extraPrice: number;
};

// ─── Raw label shape from t.raw() ────────────────────────────────────────────

interface RawOptionLabel {
  id: string;
  label: string;
}

// ─── Prices (static — not translated) ────────────────────────────────────────

const PROTEIN_PRICES: Record<string, number> = {
  pork: 0,
  chicken: 0,
  prawn: 1.5,
  beef: 1.5,
  tofu: 0,
  pork_belly: 2.0,
  mixed: 1.0,
};

const EXTRAS_PRICES: Record<string, number> = {
  extra_beef: 3.0,
  extra_chicken: 3.0,
  extra_prawn: 3.0,
  extra_seafood: 5.0,
  extra_crispy_pork: 5.0,
  extra_veggies: 3.0,
  extra_noodles: 2.0,
  extra_fried_egg: 2.5,
  extra_broth: 2.0,
  extra_chilli: 1.0,
  extra_sauce: 2.0,
};

const SAUCE_PRICES: Record<string, number> = {
  sauce_mayo: 1.0,
  sauce_hoisin: 1.0,
  sauce_fish: 1.0,
  sauce_soy: 1.0,
  sauce_chilli: 1.0,
  no_sauce: 0,
};

// ─── Merge translated labels with static prices ───────────────────────────────

function mergeLabels(
  raw: RawOptionLabel[],
  prices: Record<string, number>,
): CustomOption[] {
  return raw.map(({ id, label }) => ({ id, label, price: prices[id] ?? 0 }));
}

// ─── Hook: build option groups with translated titles + labels ────────────────

function useOptionGroups(category: string): OptionGroup[] {
  const t = useTranslations("ItemCustomiseModal");

  return useMemo(() => {
    const cat = category.toLowerCase();

    const proteins = mergeLabels(
      t.raw("proteinOptions") as RawOptionLabel[],
      PROTEIN_PRICES,
    );
    const extras = mergeLabels(
      t.raw("unifiedExtras") as RawOptionLabel[],
      EXTRAS_PRICES,
    );
    const banhMiVeg = mergeLabels(
      t.raw("banhMiVeggies") as RawOptionLabel[],
      {},
    );
    const spices = mergeLabels(t.raw("spiceOptions") as RawOptionLabel[], {});
    const sauces = mergeLabels(
      t.raw("sauceOptions") as RawOptionLabel[],
      SAUCE_PRICES,
    );

    const titles = t.raw("groupTitles") as Record<string, string>;

    if (cat.includes("bánh mì") || cat.includes("banh mi")) {
      return [
        {
          id: "protein",
          title: titles.protein_banh_mi,
          type: "single",
          required: true,
          options: proteins,
        },
        { id: "extras", title: titles.extras, type: "multi", options: extras },
        {
          id: "veggies",
          title: titles.veggies,
          type: "multi",
          options: banhMiVeg,
        },
        {
          id: "spice",
          title: titles.spice,
          type: "single",
          required: true,
          options: spices,
        },
        {
          id: "sauce",
          title: titles.sauce_banh_mi,
          type: "multi",
          options: sauces,
        },
      ];
    }

    if (
      cat.includes("pho") ||
      cat.includes("phở") ||
      cat.includes("bún bò") ||
      cat.includes("soup")
    ) {
      return [
        {
          id: "extras",
          title: titles.extras,
          type: "multi",
          required: false,
          options: extras,
        },
        {
          id: "spice",
          title: titles.spice,
          type: "single",
          required: true,
          options: spices,
        },
        {
          id: "sauce",
          title: titles.sauce_condiments,
          type: "multi",
          options: sauces,
        },
      ];
    }

    if (
      cat.includes("rice paper") ||
      cat.includes("cuốn") ||
      cat.includes("goi") ||
      cat.includes("gỏi")
    ) {
      return [
        { id: "extras", title: titles.extras, type: "multi", options: extras },
        { id: "spice", title: titles.spice, type: "single", options: spices },
        {
          id: "sauce",
          title: titles.sauce_condiments,
          type: "multi",
          options: sauces,
        },
      ];
    }

    if (
      cat.includes("com") ||
      cat.includes("rice") ||
      cat.includes("fried rice") ||
      cat.includes("bun") ||
      cat.includes("bún")
    ) {
      return [
        {
          id: "protein",
          title: titles.protein_rice,
          type: "single",
          options: proteins,
        },
        { id: "extras", title: titles.extras, type: "multi", options: extras },
        { id: "spice", title: titles.spice, type: "single", options: spices },
        {
          id: "sauce",
          title: titles.sauce_banh_mi,
          type: "multi",
          options: sauces,
        },
      ];
    }

    if (
      cat.includes("chicken") ||
      cat.includes("burger") ||
      cat.includes("stir") ||
      cat.includes("noodle") ||
      cat.includes("main")
    ) {
      return [
        { id: "extras", title: titles.extras, type: "multi", options: extras },
        { id: "spice", title: titles.spice, type: "single", options: spices },
        {
          id: "sauce",
          title: titles.sauce_banh_mi,
          type: "multi",
          options: sauces,
        },
      ];
    }

    if (
      cat.includes("entrée") ||
      cat.includes("entree") ||
      cat.includes("appetis") ||
      cat.includes("starter")
    ) {
      return [
        { id: "extras", title: titles.extras, type: "multi", options: extras },
        { id: "spice", title: titles.spice, type: "single", options: spices },
        {
          id: "sauce",
          title: titles.sauce_condiments,
          type: "multi",
          options: sauces,
        },
      ];
    }

    // Default
    return [
      { id: "spice", title: titles.spice, type: "single", options: spices },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  item: MenuItem;
  onConfirm: (customisation: ItemCustomisation) => void;
  onClose: () => void;
}

export function ItemCustomiseModal({ item, onConfirm, onClose }: Props) {
  const t = useTranslations("ItemCustomiseModal");
  const groups = useOptionGroups(item.category);

  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    groups.forEach((g) => {
      init[g.id] = g.id === "spice" ? ["medium"] : [];
    });
    return init;
  });

  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      const init: Record<string, boolean> = {};
      groups.forEach((g) => {
        init[g.id] = true;
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

  const extraPrice = useMemo(() => {
    let total = 0;
    groups.forEach((g) => {
      (selections[g.id] ?? []).forEach((optId) => {
        const opt = g.options.find((o) => o.id === optId);
        if (opt) total += opt.price;
      });
    });
    return total;
  }, [selections, groups]);

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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="border border-gray-100 rounded-xl overflow-hidden"
            >
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {group.id === "spice" && (
                    <Flame className="w-4 h-4 text-red-500" />
                  )}
                  {group.id === "veggies" && (
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

              {/* Options */}
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

          {/* Special Instructions */}
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

        {/* Footer: qty + add to cart */}
        <div className="border-t border-gray-100 p-4 bg-white sticky bottom-0">
          <div className="flex items-center gap-3">
            {/* Qty control */}
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

            {/* Add to cart */}
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
