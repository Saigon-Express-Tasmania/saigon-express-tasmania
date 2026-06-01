"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { X, MapPin, Search, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import type { StoreLocation } from "@/types";

interface PickLocationModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (store: StoreLocation) => void;
  stores: StoreLocation[];
}

/** Parse hours JSON and return today's hours string */
function getTodayHours(hoursJson: string | null, fallback: string): string {
  if (!hoursJson) return fallback;
  try {
    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const key = days[new Date().getDay()];
    const parsed = JSON.parse(hoursJson) as Record<string, string>;
    return parsed[key] ?? fallback;
  } catch {
    return fallback;
  }
}

/** Check if store is open right now */
function isOpenNow(hoursJson: string | null): boolean {
  if (!hoursJson) return false;
  try {
    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const key = days[new Date().getDay()];
    const parsed = JSON.parse(hoursJson) as Record<string, string>;
    const todayHours = parsed[key];
    if (!todayHours) return false;

    const match = todayHours.match(
      /(\d+:\d+\s*[AP]M)\s*-\s*(\d+:\d+\s*[AP]M)/i,
    );
    if (!match) return false;

    const parseTime = (t: string) => {
      const [time, period] = t.trim().split(/\s+/);
      const [h0, m] = time.split(":").map(Number);
      let h = h0;
      if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
      if (period?.toUpperCase() === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };

    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= parseTime(match[1]) && nowMins <= parseTime(match[2]);
  } catch {
    return false;
  }
}

export default function PickLocationModal({
  open,
  onClose,
  onSelect,
  stores,
}: PickLocationModalProps) {
  const t = useTranslations("PickLocationModal");
  const [search, setSearch] = useState("");
  const { cartCount, cartTotal } = useCart();

  const storesFiltered = useMemo(() => {
    if (!search.trim()) return stores;
    const q = search.toLowerCase();
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        (s.suburb ?? "").toLowerCase().includes(q),
    );
  }, [stores, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t("heading")}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {t(cartCount === 1 ? "cartItems_one" : "cartItems_other", {
                count: cartCount,
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0 mt-0.5"
          >
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pb-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-brand-red rounded-full text-sm focus:outline-none focus:border-brand-red placeholder-gray-400"
              autoFocus
            />
          </div>
        </div>

        {/* Store list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
          {storesFiltered.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <MapPin size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("noResults")}</p>
            </div>
          ) : (
            storesFiltered.map((store) => {
              const storeOpen = isOpenNow(store.hours);
              const todayHours = getTodayHours(
                store.hours,
                t("hoursUnavailable"),
              );
              return (
                <button
                  key={store.id}
                  onClick={() => {
                    onSelect(store);
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 p-4 border border-gray-100 rounded-2xl hover:border-brand-red hover:bg-red-50/30 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-brand-red" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">
                      {store.name.replace(/^SGE\s+/, "")}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {store.suburb ?? store.address}
                    </p>
                    <p className="text-xs mt-0.5">
                      <span
                        className={
                          storeOpen
                            ? "text-green-600 font-medium"
                            : "text-orange-500 font-medium"
                        }
                      >
                        {storeOpen ? t("openNow") : t("closed")}
                      </span>
                      <span className="text-gray-400 ml-1">· {todayHours}</span>
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-gray-300 group-hover:text-brand-red transition-colors flex-shrink-0"
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Bottom cart summary */}
        <div className="border-t border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {t(cartCount === 1 ? "cartSummary_one" : "cartSummary_other", {
                count: cartCount,
              })}
            </span>
            <span className="font-bold text-gray-900">
              ${cartTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
