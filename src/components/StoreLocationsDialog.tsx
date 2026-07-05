"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { X, MapPin, Clock } from "lucide-react";
import type { StoreLocation } from "@/types";

function formatHours(hoursJson: string | null | undefined): string {
  if (!hoursJson) return "11:00 AM – 8:30 PM";
  try {
    const h = JSON.parse(hoursJson);
    const val = h.mon ?? h.Mon ?? Object.values(h)[0] ?? "11:00 AM – 8:30 PM";
    return String(val);
  } catch {
    return hoursJson;
  }
}

function isOpenNow(hoursJson: string | null | undefined): boolean {
  const hours = formatHours(hoursJson);
  try {
    const match = hours.match(/(\d+:\d+\s*[AP]M)\s*[-–]\s*(\d+:\d+\s*[AP]M)/i);
    if (!match) return false;
    const parse = (t: string) => {
      const [time, period] = t.trim().split(/\s+/);
      const [h0, m] = time.split(":").map(Number);
      let h = h0;
      if (period.toUpperCase() === "PM" && h !== 12) h += 12;
      if (period.toUpperCase() === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    return cur >= parse(match[1]) && cur < parse(match[2]);
  } catch {
    return false;
  }
}

type OrderType = "pickup" | "delivery";
type DialogPhase = "closed" | "entering" | "open" | "exiting";

/** Above cart drawer (200), customise modal (200), pick-location (300), and floating widgets (50). */
const DIALOG_Z_INDEX = 10000;
const ANIM_MS = 180;

export type StoreLocationsDialogProps = {
  open: boolean;
  onClose: () => void;
  stores: StoreLocation[];
  title?: string;
  subtitle?: string;
};

export default function StoreLocationsDialog({
  open,
  onClose,
  stores,
  title,
  subtitle,
}: StoreLocationsDialogProps) {
  const t = useTranslations("StoreLocationsDialog");
  const tFinder = useTranslations("StoreFinder");
  const sortedStores = useMemo(
    () => [...stores].sort((a, b) => a.sortOrder - b.sortOrder),
    [stores],
  );
  const [orderType, setOrderType] = useState<OrderType>("pickup");
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [phase, setPhase] = useState<DialogPhase>("closed");

  useEffect(() => {
    if (open) {
      setPhase("entering");
      const timer = window.setTimeout(() => setPhase("open"), ANIM_MS);
      return () => window.clearTimeout(timer);
    }

    setPhase((current) =>
      current === "closed" || current === "exiting" ? current : "exiting",
    );
    const timer = window.setTimeout(() => setPhase("closed"), ANIM_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (phase === "closed") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  useEffect(() => {
    if (!open) return;
    setOrderType("pickup");
    setSelectedStoreId(sortedStores[0]?.id ?? null);
  }, [open, sortedStores]);

  if (phase === "closed") return null;

  const panelAnimClass =
    phase === "entering"
      ? "animate-store-locations-dialog-in"
      : phase === "exiting"
        ? "animate-store-locations-dialog-out"
        : "";
  const backdropAnimClass =
    phase === "entering"
      ? "animate-store-locations-backdrop-in"
      : phase === "exiting"
        ? "animate-store-locations-backdrop-out"
        : "";

  const heading = title ?? t("heading");
  const subheading = subtitle ?? t("subheading");
  const selectedStore = sortedStores.find((s) => s.id === selectedStoreId) ?? null;
  const canOrder = Boolean(selectedStore?.deliveryUrl);

  const handleOrder = () => {
    if (!selectedStore?.deliveryUrl) return;
    window.open(selectedStore.deliveryUrl, "_blank", "noopener,noreferrer");
  };

  const content = (
    <div
      className="fixed inset-0 flex justify-end"
      style={
        {
          zIndex: DIALOG_Z_INDEX,
          "--store-locations-anim-ms": `${ANIM_MS}ms`,
        } as CSSProperties
      }
    >
      <div
        className={`absolute inset-0 bg-black/55 ${backdropAnimClass}`}
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-locations-dialog-title"
        className={`relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl sm:rounded-l-2xl ${panelAnimClass}`}
      >
        <div className="shrink-0 border-b border-gray-100 bg-white px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top,0px))] sm:px-5 sm:pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="store-locations-dialog-title"
                className="font-serif text-base font-bold leading-tight text-brand-dark sm:text-lg"
              >
                {heading}
              </h2>
              {subheading ? (
                <p className="mt-0.5 text-[11px] leading-snug text-brand-dark/50 sm:text-xs">
                  {subheading}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
              aria-label={t("closeLabel")}
            >
              <X size={15} className="text-gray-600" />
            </button>
          </div>
        </div>

        {sortedStores.length > 0 ? (
          <div
            className="shrink-0 border-b border-gray-100 px-4 py-3 sm:px-5"
            role="radiogroup"
            aria-label={t("orderTypeLabel")}
          >
            <p className="mb-2 text-xs font-semibold text-brand-dark/70">
              {t("orderTypeLabel")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["pickup", "delivery"] as const).map((type) => {
                const selected = orderType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setOrderType(type)}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                      selected
                        ? "border-brand-red bg-brand-red/5 text-brand-red"
                        : "border-gray-200 bg-white text-brand-dark/70 hover:border-brand-red/30"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected
                          ? "border-brand-red"
                          : "border-gray-300"
                      }`}
                    >
                      {selected ? (
                        <span className="h-2 w-2 rounded-full bg-brand-red" />
                      ) : null}
                    </span>
                    {type === "pickup" ? t("pickup") : t("delivery")}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5"
          role="radiogroup"
          aria-label={t("locationLabel")}
        >
          {sortedStores.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-brand-cream/40 px-4 py-8 text-center text-sm text-brand-dark/50">
              {tFinder("list.empty")}
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs font-semibold text-brand-dark/70">
                {t("locationLabel")}
              </p>
              <ul className="space-y-2">
                {sortedStores.map((store) => {
                  const hours = formatHours(store.hours);
                  const storeOpen = isOpenNow(store.hours);
                  const showHalal = store.name
                    .toLowerCase()
                    .includes("sandy bay");
                  const selected = selectedStoreId === store.id;
                  const unavailable = !store.deliveryUrl;

                  return (
                    <li key={store.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={unavailable}
                        onClick={() => setSelectedStoreId(store.id)}
                        className={`w-full rounded-xl border-2 px-3 py-3 text-left transition-colors ${
                          unavailable
                            ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60"
                            : selected
                              ? "border-brand-red bg-brand-red/5"
                              : "border-gray-200 bg-white hover:border-brand-red/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
                              selected && !unavailable
                                ? "border-brand-red"
                                : "border-gray-300"
                            }`}
                          >
                            {selected && !unavailable ? (
                              <span className="h-2.5 w-2.5 rounded-full bg-brand-red" />
                            ) : null}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <MapPin
                                size={13}
                                className="shrink-0 text-brand-red"
                                aria-hidden
                              />
                              <span className="text-sm font-semibold text-brand-dark">
                                {store.name}
                              </span>
                              <span
                                className={`rounded-full px-1.5 py-px text-[9px] font-bold tracking-wide ${
                                  storeOpen
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-50 text-red-600"
                                }`}
                              >
                                {storeOpen
                                  ? tFinder("list.statusOpen")
                                  : tFinder("list.statusClosed")}
                              </span>
                              {showHalal ? (
                                <span className="rounded-full bg-green-100 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-green-700">
                                  {tFinder("list.halalBadge")}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-brand-dark/50">
                              {store.address}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-brand-dark/55">
                              <Clock
                                size={11}
                                className="shrink-0 text-brand-red"
                              />
                              <span>{hours}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {sortedStores.length > 0 ? (
          <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:px-5">
            <button
              type="button"
              onClick={handleOrder}
              disabled={!canOrder}
              className={`w-full rounded-xl py-3.5 text-sm font-bold transition-colors ${
                canOrder
                  ? "bg-brand-red text-white hover:bg-brand-red/90 active:scale-[0.99]"
                  : "cursor-not-allowed bg-gray-100 text-gray-400"
              }`}
            >
              {canOrder
                ? orderType === "pickup"
                  ? t("actionPickup")
                  : t("actionDelivery")
                : t("selectLocation")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
