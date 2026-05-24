"use client";

import AppImage from "@/components/AppImage";
import { useEffect, useRef, useState } from "react";
import { X, Plus, ShoppingBag, Check } from "lucide-react";

export interface SuggestedItem {
  id: number;
  name: string;
  category: string;
  price: string;
  imageUrl?: string | null;
  isAvailable: boolean;
  description?: string | null;
}

interface AddOnSuggestionModalProps {
  triggerItem: SuggestedItem | null;
  suggestions: SuggestedItem[];
  cartIds: Set<number>;
  onAdd: (item: SuggestedItem) => void;
  onClose: () => void;
}

const CATEGORY_IMGS: Record<string, string> = {
  "Drinks":              "/manus-storage/spring-rolls-2_f1e40ae6.jpg",
  "Entrée":              "/manus-storage/entree-seafood-spring-rolls_f060f6bd.jpg",
  "Rice Paper Rolls":    "/manus-storage/saigo_express__Cuon_Vietnamese_prawn_rice_paper_rolls_NativeLarge_5da191dd.png",
  "Burgers & Chicken":   "/manus-storage/banh-mi-2_7d02846f.jpg",
};
const DEFAULT_IMG = "/manus-storage/banh-mi-1_9ba4dcf0.jpg";

// Delay (ms) between the animation completing and the modal closing
const DISMISS_DELAY = 600;

export default function AddOnSuggestionModal({
  triggerItem,
  suggestions,
  cartIds,
  onAdd,
  onClose,
}: AddOnSuggestionModalProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track which card is currently animating (null = none)
  const [addingId, setAddingId] = useState<number | null>(null);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!triggerItem) return;
    timerRef.current = setTimeout(onClose, 8000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [triggerItem, onClose]);

  // Reset animation state whenever the modal opens with a new trigger
  useEffect(() => {
    setAddingId(null);
  }, [triggerItem]);

  if (!triggerItem || suggestions.length === 0) return null;

  const handleAdd = (item: SuggestedItem) => {
    if (addingId !== null || !item.isAvailable) return;
    // 1. Start the card animation
    setAddingId(item.id);
    // 2. Fire the actual add + dismiss after the animation settles
    setTimeout(() => {
      onAdd(item);
      // onAdd already calls onClose via the parent handler
    }, DISMISS_DELAY);
  };

  return (
    <>
      {/* Backdrop — click to dismiss */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Modal panel — slides up from bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-brand-red" />
            <span className="text-sm font-semibold text-brand-dark">
              Added <span className="text-brand-red">{triggerItem.name}</span> — complete your meal?
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-brand-dark/40 hover:text-brand-dark transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Suggestion cards */}
        <div className="flex gap-3 px-5 py-4 overflow-x-auto scrollbar-hide">
          {suggestions.map(item => {
            const inCart = cartIds.has(item.id);
            const isAnimating = addingId === item.id;

            return (
              <div
                key={item.id}
                className={`flex-none w-44 bg-gray-50 border border-gray-100 overflow-hidden transition-transform duration-150 ${
                  isAnimating ? "animate-card-add" : ""
                }`}
              >
                {/* Image with checkmark overlay during animation */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-200">
                  <AppImage
                    src={item.imageUrl ?? CATEGORY_IMGS[item.category] ?? DEFAULT_IMG}
                    alt={item.name}
                    fill
                    className={`object-cover transition-all duration-300 ${
                      isAnimating ? "brightness-75 scale-105" : ""
                    }`}
                  />
                  {/* Checkmark overlay — fades in during animation */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                      isAnimating ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg animate-check-pop">
                      <Check size={20} className="text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <p className="text-[9px] font-bold text-brand-red uppercase tracking-widest mb-0.5">
                    {item.category}
                  </p>
                  <p className="text-xs font-semibold text-brand-dark leading-snug mb-1 line-clamp-2">
                    {item.name}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-dark">
                      ${parseFloat(item.price).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleAdd(item)}
                      disabled={inCart || !item.isAvailable || addingId !== null}
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 transition-all duration-200 ${
                        isAnimating
                          ? "bg-green-500 text-white scale-95"
                          : inCart
                          ? "bg-green-600 text-white cursor-default"
                          : item.isAvailable
                          ? "bg-brand-red text-white hover:bg-brand-red/90 active:scale-95"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isAnimating || inCart
                        ? <><Check size={10} /> Added</>
                        : <><Plus size={10} /> Add</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar auto-dismiss indicator */}
        <div className="h-0.5 bg-gray-100 mx-5 mb-4 overflow-hidden">
          <div className="h-full bg-brand-red animate-shrink-width" />
        </div>
      </div>
    </>
  );
}
