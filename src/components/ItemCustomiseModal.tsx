"use client";

import AppImage from "@/components/AppImage";
import React, { useState, useMemo } from "react";
import { X, Plus, Minus, ChevronDown, ChevronUp, MessageSquare, Flame, Leaf, ShoppingCart } from "lucide-react";
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
  selections: Record<string, string[]>; // groupId → selected option ids
  qty: number;
  note: string;
  extraPrice: number; // total add-on price
};

// ─── Option group definitions per category ───────────────────────────────────
const PROTEIN_OPTIONS: CustomOption[] = [
  { id: "pork", label: "BBQ Pork (Xá Xíu)", price: 0 },
  { id: "chicken", label: "Grilled Chicken", price: 0 },
  { id: "prawn", label: "Prawn", price: 1.5 },
  { id: "beef", label: "Beef (Bò)", price: 1.5 },
  { id: "tofu", label: "Tofu (Vegetarian)", price: 0 },
  { id: "pork_belly", label: "Crackling Pork Belly", price: 2.0 },
  { id: "mixed", label: "Mixed Proteins", price: 1.0 },
];

const UNIFIED_EXTRAS: CustomOption[] = [
  { id: "extra_beef", label: "Extra Beef", price: 3.0 },
  { id: "extra_chicken", label: "Extra Chicken", price: 3.0 },
  { id: "extra_prawn", label: "Extra Prawn", price: 3.0 },
  { id: "extra_seafood", label: "Extra Seafood", price: 5.0 },
  { id: "extra_crispy_pork", label: "Extra Crispy Pork", price: 5.0 },
  { id: "extra_veggies", label: "Extra Veggies", price: 3.0 },
  { id: "extra_noodles", label: "Extra Noodles", price: 2.0 },
  { id: "extra_fried_egg", label: "Extra Fried Egg", price: 2.5 },
  { id: "extra_broth", label: "Extra Broth", price: 2.0 },
  { id: "extra_chilli", label: "Extra Chilli", price: 1.0 },
  { id: "extra_sauce", label: "Extra Sauce", price: 2.0 },
];

const BANH_MI_VEGGIES: CustomOption[] = [
  { id: "no_coriander", label: "No Coriander", price: 0 },
  { id: "no_spring_onion", label: "No Spring Onion", price: 0 },
  { id: "no_daikon", label: "No Daikon & Carrot", price: 0 },
  { id: "no_cucumber", label: "No Cucumber", price: 0 },
  { id: "extra_veggies", label: "Extra Veggies", price: 0 },
  { id: "extra_coriander", label: "Extra Coriander", price: 0 },
  { id: "extra_cucumber", label: "Extra Cucumber", price: 0 },
  { id: "no_veggies", label: "No Veggies at All", price: 0 },
];

const SPICE_OPTIONS: CustomOption[] = [
  { id: "no_chilli", label: "No Chilli", price: 0 },
  { id: "mild", label: "Mild", price: 0 },
  { id: "medium", label: "Medium", price: 0 },
  { id: "hot", label: "Hot 🌶️", price: 0 },
  { id: "extra_hot", label: "Extra Hot 🌶️🌶️", price: 0 },
];

const SAUCE_OPTIONS: CustomOption[] = [
  { id: "sauce_mayo", label: "Sriracha Mayo", price: 1.0 },
  { id: "sauce_hoisin", label: "Hoisin Sauce", price: 1.0 },
  { id: "sauce_fish", label: "Fish Sauce Dressing", price: 1.0 },
  { id: "sauce_soy", label: "Soy Sauce", price: 1.0 },
  { id: "sauce_chilli", label: "Chilli Sauce", price: 1.0 },
  { id: "no_sauce", label: "No Sauce", price: 0 },
];



// ─── Category → option groups map ────────────────────────────────────────────
function getOptionGroups(category: string): OptionGroup[] {
  const cat = category.toLowerCase();

  if (cat.includes("bánh mì") || cat.includes("banh mi")) {
    return [
      { id: "protein", title: "Choose Your Protein", type: "single", required: true, options: PROTEIN_OPTIONS },
      { id: "extras", title: "Add Extras", type: "multi", options: UNIFIED_EXTRAS },
      { id: "veggies", title: "Veggies & Toppings", type: "multi", options: BANH_MI_VEGGIES },
      { id: "spice", title: "Spice Level", type: "single", required: true, options: SPICE_OPTIONS },
      { id: "sauce", title: "Sauce", type: "multi", options: SAUCE_OPTIONS },
    ];
  }

  if (cat.includes("pho") || cat.includes("phở") || cat.includes("bún bò") || cat.includes("soup")) {
    return [
      { id: "extras", title: "Add Extras", type: "multi", options: UNIFIED_EXTRAS },
      { id: "spice", title: "Spice Level", type: "single", required: true, options: SPICE_OPTIONS },
      { id: "sauce", title: "Condiments", type: "multi", options: SAUCE_OPTIONS },
    ];
  }

  if (cat.includes("rice paper") || cat.includes("cuốn") || cat.includes("goi") || cat.includes("gỏi")) {
    return [
      { id: "extras", title: "Add Extras", type: "multi", options: UNIFIED_EXTRAS },
      { id: "spice", title: "Spice Level", type: "single", options: SPICE_OPTIONS },
      { id: "sauce", title: "Condiments", type: "multi", options: SAUCE_OPTIONS },
    ];
  }

  if (cat.includes("com") || cat.includes("rice") || cat.includes("fried rice") || cat.includes("bun") || cat.includes("bún")) {
    return [
      { id: "protein", title: "Protein Choice", type: "single", options: PROTEIN_OPTIONS },
      { id: "extras", title: "Add Extras", type: "multi", options: UNIFIED_EXTRAS },
      { id: "spice", title: "Spice Level", type: "single", options: SPICE_OPTIONS },
      { id: "sauce", title: "Sauce", type: "multi", options: SAUCE_OPTIONS },
    ];
  }

  if (cat.includes("chicken") || cat.includes("burger") || cat.includes("stir") || cat.includes("noodle") || cat.includes("main")) {
    return [
      { id: "extras", title: "Add Extras", type: "multi", options: UNIFIED_EXTRAS },
      { id: "spice", title: "Spice Level", type: "single", options: SPICE_OPTIONS },
      { id: "sauce", title: "Sauce", type: "multi", options: SAUCE_OPTIONS },
    ];
  }

  // Entrée / appetiser category
  if (cat.includes("entrée") || cat.includes("entree") || cat.includes("appetis") || cat.includes("starter")) {
    return [
      { id: "extras", title: "Add Extras", type: "multi", options: UNIFIED_EXTRAS },
      { id: "spice", title: "Spice Level", type: "single", options: SPICE_OPTIONS },
      { id: "sauce", title: "Condiments", type: "multi", options: SAUCE_OPTIONS },
    ];
  }

  // Default: spice + note only
  return [
    { id: "spice", title: "Spice Level", type: "single", options: SPICE_OPTIONS },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  item: MenuItem;
  onConfirm: (customisation: ItemCustomisation) => void;
  onClose: () => void;
}

export function ItemCustomiseModal({ item, onConfirm, onClose }: Props) {
  const groups = useMemo(() => getOptionGroups(item.category), [item.category]);
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    groups.forEach(g => {
      if (g.id === "spice") init[g.id] = ["medium"];
      else init[g.id] = [];
    });
    return init;
  });
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    groups.forEach(g => { init[g.id] = true; });
    return init;
  });

  const toggleGroup = (id: string) =>
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleOption = (groupId: string, optionId: string, type: "single" | "multi") => {
    setSelections(prev => {
      const current = prev[groupId] ?? [];
      if (type === "single") {
        return { ...prev, [groupId]: current.includes(optionId) ? [] : [optionId] };
      } else {
        return {
          ...prev,
          [groupId]: current.includes(optionId)
            ? current.filter(id => id !== optionId)
            : [...current, optionId],
        };
      }
    });
  };

  const extraPrice = useMemo(() => {
    let total = 0;
    groups.forEach(g => {
      (selections[g.id] ?? []).forEach(optId => {
        const opt = g.options.find(o => o.id === optId);
        if (opt) total += opt.price;
      });
    });
    return total;
  }, [selections, groups]);

  const basePrice = parseFloat(item.price);
  const lineTotal = (basePrice + extraPrice) * qty;

  const handleConfirm = () => {
    onConfirm({ selections, qty, note, extraPrice });
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          {item.imageUrl && (
            <AppImage src={item.imageUrl} alt={item.name} width={64} height={64} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-lg leading-tight">{item.name}</h2>
            {item.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
            )}
            <p className="text-red-600 font-semibold mt-1">${basePrice.toFixed(2)}</p>
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
          {groups.map(group => (
            <div key={group.id} className="border border-gray-100 rounded-xl overflow-hidden">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {group.id === "spice" && <Flame className="w-4 h-4 text-red-500" />}
                  {group.id === "veggies" && <Leaf className="w-4 h-4 text-green-500" />}
                  <span className="font-semibold text-gray-800 text-sm">{group.title}</span>
                  {group.required && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Required</span>
                  )}
                  {group.type === "multi" && (
                    <span className="text-xs text-gray-400">Choose any</span>
                  )}
                </div>
                {expandedGroups[group.id]
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
              </button>

              {/* Options */}
              {expandedGroups[group.id] && (
                <div className="divide-y divide-gray-50">
                  {group.options.map(opt => {
                    const selected = (selections[group.id] ?? []).includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleOption(group.id, opt.id, group.type)}
                        className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${
                          selected ? "bg-red-50" : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-${group.type === "single" ? "full" : "md"} border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                            selected
                              ? "border-red-600 bg-red-600"
                              : "border-gray-300"
                          }`}>
                            {selected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-sm ${selected ? "text-gray-900 font-medium" : "text-gray-700"}`}>
                            {opt.label}
                          </span>
                        </div>
                        {opt.price > 0 && (
                          <span className={`text-sm font-medium flex-shrink-0 ml-2 ${selected ? "text-red-600" : "text-gray-500"}`}>
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
              <span className="font-semibold text-gray-800 text-sm">Special Instructions</span>
              <span className="text-xs text-gray-400">Optional</span>
            </div>
            <div className="p-3">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. No peanuts, extra sauce on the side, make it extra crispy..."
                rows={3}
                maxLength={200}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{note.length}/200</p>
            </div>
          </div>
        </div>

        {/* Footer: qty + add to cart */}
        <div className="border-t border-gray-100 p-4 bg-white sticky bottom-0">
          <div className="flex items-center gap-3">
            {/* Qty control */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-1 py-1">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Minus className="w-4 h-4 text-gray-700" />
              </button>
              <span className="w-6 text-center font-bold text-gray-900">{qty}</span>
              <button
                onClick={() => setQty(q => q + 1)}
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
                <span>Add to Cart</span>
              </div>
              <span>${lineTotal.toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
