"use client";

import { useMemo, useState } from "react";
import Link from "@/components/link";
import { useTranslations } from "next-intl";
import { MapPin, Clock, Phone, ExternalLink, ChevronRight } from "lucide-react";
import {
  TASMANIA_MAP_EMBED_URL,
  resolvePickupStoreMapEmbedUrl,
} from "@/lib/google-maps-embed";
import type { StoreLocation } from "@/types";

// Parse hours JSON from DB: { mon: "11:00 AM - 8:30 PM", ... }
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

// Determine if a store is currently open based on its hours
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

type StoreFinderProps = {
  stores: StoreLocation[];
};

export default function StoreFinder({ stores }: StoreFinderProps) {
  const t = useTranslations("StoreFinder");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreLocation | null>(
    null,
  );

  const mapEmbedUrl = useMemo(() => {
    if (!selectedStore) return TASMANIA_MAP_EMBED_URL;
    return resolvePickupStoreMapEmbedUrl(selectedStore) ?? TASMANIA_MAP_EMBED_URL;
  }, [selectedStore]);

  const handleStoreClick = (storeId: number) => {
    const store = stores.find((s: StoreLocation) => s.id === storeId);
    if (!store) return;

    const isDeselecting = selectedId === storeId;
    setSelectedId(isDeselecting ? null : storeId);
    setSelectedStore(isDeselecting ? null : store);
  };

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      {/* Hero */}
      <section className="relative h-48 md:h-64 overflow-hidden">
        <div className="absolute inset-0 bg-brand-dark" />
        <div className="relative z-10 h-full flex flex-col items-start justify-end px-6 md:px-16 pb-10 max-w-[1280px] mx-auto">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-2">
            {t("hero.eyebrow")}
          </p>
          <h1 className="font-serif text-white text-4xl md:text-5xl leading-tight">
            {t("hero.heading")}
          </h1>
          <p className="text-white/60 text-sm mt-2">{t("hero.subheading")}</p>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Store list */}
          <div className="lg:col-span-2 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {stores.length === 0 ? (
              <div className="p-6 bg-white border border-gray-200 rounded">
                {t("list.empty")}
              </div>
            ) : (
              stores.map((store: StoreLocation) => {
                const hours = formatHours(store.hours);
                const open = isOpenNow(store.hours);
                const isSelected = selectedId === store.id;
                return (
                  <div
                    key={store.id}
                    onClick={() => handleStoreClick(store.id)}
                    className={`cursor-pointer transition-all duration-200 border ${
                      isSelected
                        ? "border-brand-red bg-white shadow-md"
                        : "border-gray-200 bg-white hover:border-brand-red/40 hover:shadow-sm"
                    }`}
                  >
                    {/* Card header — always visible */}
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected ? "bg-brand-red" : "bg-brand-cream"
                          }`}
                        >
                          <MapPin
                            size={15}
                            className={
                              isSelected ? "text-white" : "text-brand-red"
                            }
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="font-semibold text-sm text-brand-dark leading-snug">
                              {store.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                open
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {open
                                ? t("list.statusOpen")
                                : t("list.statusClosed")}
                            </span>
                            {store.name.toLowerCase().includes("sandy bay") && (
                              <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 font-bold uppercase tracking-wide rounded-full">
                                {t("list.halalBadge")}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-brand-dark/50 mb-2">
                            {store.address}
                          </div>

                          {/* Hours — always visible */}
                          <div className="flex items-center gap-1.5 text-xs text-brand-dark/60 mb-1.5">
                            <Clock
                              size={11}
                              className="text-brand-red shrink-0"
                            />
                            <span>{hours}</span>
                          </div>

                          {/* Phone — always visible */}
                          {store.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-brand-dark/60">
                              <Phone
                                size={11}
                                className="text-brand-red shrink-0"
                              />
                              <a
                                href={`tel:${store.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-brand-red transition-colors font-medium"
                              >
                                {store.phone}
                              </a>
                            </div>
                          )}
                        </div>
                        <ChevronRight
                          size={16}
                          className={`shrink-0 mt-1 transition-transform duration-200 text-brand-dark/30 ${
                            isSelected ? "rotate-90 text-brand-red" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expanded actions — only when selected */}
                    {isSelected && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-0">
                        <div className="flex items-center gap-2 flex-wrap pt-3">
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(store.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-red border border-brand-red px-3 py-1.5 hover:bg-brand-red hover:text-white transition-colors"
                          >
                            {t("card.getDirections")} <ExternalLink size={11} />
                          </a>
                          {store.deliveryUrl && (
                            <a
                              href={store.deliveryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-xs font-bold bg-brand-red text-white px-3 py-1.5 hover:bg-brand-red/90 transition-colors"
                            >
                              {t("card.orderDelivery")}
                            </a>
                          )}
                          {store.deliveryUrl && (
                            <a
                              href={store.deliveryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-xs font-bold bg-brand-dark text-white px-3 py-1.5 hover:bg-brand-dark/80 transition-colors cursor-pointer"
                            >
                              {t("card.orderPickup")}
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Map */}
          <div
            className="lg:col-span-3 overflow-hidden border border-gray-200 shadow-lg"
            style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}
          >
            <iframe
              key={mapEmbedUrl}
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={
                selectedStore
                  ? t("map.storeTitle", { store: selectedStore.name })
                  : t("map.tasmaniaTitle")
              }
            />
          </div>
        </div>
      </div>

      {/* Footer strip */}
      <div className="bg-brand-dark text-white py-8 mt-8">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-serif text-xl mb-1">{t("footer.heading")}</p>
            <p className="text-white/50 text-sm">{t("footer.body")}</p>
          </div>
          <Link href="/franchise">
            <span className="inline-flex items-center gap-2 bg-brand-red text-white px-6 py-3 font-semibold text-sm hover:bg-brand-red/90 transition-colors cursor-pointer">
              {t("footer.cta")}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
