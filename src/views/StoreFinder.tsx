"use client";

import { useState, useCallback } from "react";
import Link from "@/components/link";
import { MapPin, Clock, Phone, ExternalLink, ArrowLeft, ChevronRight } from "lucide-react";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { STORE_LOCATIONS } from "@/lib/mock-data";

type StoreLocation = (typeof STORE_LOCATIONS)[number];

const LOGO_URL = "/manus-storage/saigon-express-logo-transparent_62bc8ecb.png";

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
      let [h, m] = time.split(":").map(Number);
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

export default function StoreFinder() {
  const { data: stores = [], isLoading } = trpc.public.storeLocations.useQuery();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [markersAdded, setMarkersAdded] = useState(false);

  const selectedStore = stores.find((s: StoreLocation) => s.id === selectedId) ?? null;

  const handleMapReady = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
    map.setCenter({ lat: -42.0, lng: 147.3 });
    map.setZoom(9);
  }, []);

  const addMarkers = useCallback((map: google.maps.Map, storeList: StoreLocation[]) => {
    storeList.forEach((store: StoreLocation) => {
      const lat = parseFloat(String(store.lat));
      const lng = parseFloat(String(store.lng));
      if (isNaN(lat) || isNaN(lng)) return;

      const hours = formatHours(store.hours);
      const open = isOpenNow(store.hours);

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: store.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: "#C41E3A",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2.5,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family:'DM Sans',sans-serif;padding:6px 4px;min-width:220px;max-width:260px;">
            <div style="font-weight:700;font-size:14px;color:#1a1a1a;margin-bottom:6px;line-height:1.3;">${store.name}</div>
            <div style="font-size:12px;color:#555;margin-bottom:6px;display:flex;align-items:flex-start;gap:5px;">
              <span style="margin-top:1px;">📍</span><span>${store.address}</span>
            </div>
            ${store.phone ? `<div style="font-size:12px;color:#555;margin-bottom:6px;display:flex;align-items:center;gap:5px;">
              <span>📞</span>
              <a href="tel:${store.phone}" style="color:#C41E3A;font-weight:600;text-decoration:none;">${store.phone}</a>
            </div>` : ''}
            <div style="font-size:12px;color:#555;margin-bottom:8px;display:flex;align-items:center;gap:5px;">
              <span>🕐</span>
              <span>${hours}</span>
              <span style="margin-left:4px;font-size:10px;font-weight:700;padding:1px 6px;border-radius:20px;background:${open ? '#dcfce7' : '#fee2e2'};color:${open ? '#15803d' : '#b91c1c'};">${open ? 'OPEN' : 'CLOSED'}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <a href="https://maps.google.com/?q=${encodeURIComponent(store.address)}" target="_blank"
                 style="font-size:12px;color:#C41E3A;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:3px;">
                Get Directions ↗
              </a>
              ${(store as any).deliveryUrl ? `<a href="${(store as any).deliveryUrl}" target="_blank"
                 style="font-size:11px;background:#C41E3A;color:#fff;font-weight:600;text-decoration:none;padding:4px 10px;border-radius:4px;display:inline-block;">
                🚗 Order Delivery
              </a>` : ''}
            </div>
          </div>`,
      });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
        setSelectedId(store.id);
        map.panTo({ lat, lng });
        map.setZoom(15);
      });
    });
  }, []);

  const handleMapReadyFull = useCallback((map: google.maps.Map) => {
    handleMapReady(map);
    (window as unknown as Record<string, unknown>).__sge_map = map;
  }, [handleMapReady]);

  if (!markersAdded && stores.length > 0 && mapInstance) {
    addMarkers(mapInstance, stores);
    setMarkersAdded(true);
  }

  const handleStoreClick = (storeId: number) => {
    const store = stores.find((s: StoreLocation) => s.id === storeId);
    if (!store) return;
    setSelectedId(prev => prev === storeId ? null : storeId);
    if (mapInstance) {
      const lat = parseFloat(String(store.lat));
      const lng = parseFloat(String(store.lng));
      if (!isNaN(lat) && !isNaN(lng)) {
        mapInstance.panTo({ lat, lng });
        mapInstance.setZoom(15);
      }
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream font-sans">

      {/* Top bar */}
      <div className="bg-brand-dark text-white text-xs py-2 px-4 text-center tracking-wide">
        8 locations across Tasmania — fresh Vietnamese food always nearby
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-brand-dark/50 hover:text-brand-red transition-colors text-sm font-medium">
            <ArrowLeft size={15} /> Back to Home
          </Link>
          <Link href="/"><img loading="eager" src={LOGO_URL} alt="Saigon Express Tasmania" className="h-10 w-auto object-contain" /></Link>
          <Link href="/menu">
            <span className="bg-brand-red text-white text-sm font-semibold px-4 py-2 hover:bg-brand-red/90 transition-colors cursor-pointer">
              Order Online
            </span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-48 md:h-64 overflow-hidden">
        <div className="absolute inset-0 bg-brand-dark" />
        <div className="relative z-10 h-full flex flex-col items-start justify-end px-6 md:px-16 pb-10 max-w-[1280px] mx-auto">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-2">FIND US</p>
          <h1 className="font-serif text-white text-4xl md:text-5xl leading-tight">8 Locations Across Tasmania</h1>
          <p className="text-white/60 text-sm mt-2">From Hobart CBD to Sorell — fresh bánh mì is always nearby</p>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-5 gap-6">

          {/* Store list */}
          <div className="lg:col-span-2 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {isLoading && (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="p-4 bg-white border border-gray-200 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}
            {stores.map((store: StoreLocation) => {
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
                      <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected ? "bg-brand-red" : "bg-brand-cream"
                      }`}>
                        <MapPin size={15} className={isSelected ? "text-white" : "text-brand-red"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-semibold text-sm text-brand-dark leading-snug">{store.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            open ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"
                          }`}>
                            {open ? "OPEN" : "CLOSED"}
                          </span>
                          {store.name.toLowerCase().includes("sandy bay") && (
                            <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 font-bold uppercase tracking-wide rounded-full">
                              Halal
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-brand-dark/50 mb-2">{store.address}</div>

                        {/* Hours — always visible */}
                        <div className="flex items-center gap-1.5 text-xs text-brand-dark/60 mb-1.5">
                          <Clock size={11} className="text-brand-red shrink-0" />
                          <span>{hours}</span>
                        </div>

                        {/* Phone — always visible */}
                        {store.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-brand-dark/60">
                            <Phone size={11} className="text-brand-red shrink-0" />
                            <a
                              href={`tel:${store.phone}`}
                              onClick={e => e.stopPropagation()}
                              className="hover:text-brand-red transition-colors font-medium"
                            >
                              {store.phone}
                            </a>
                          </div>
                        )}
                      </div>
                      <ChevronRight
                        size={16}
                        className={`shrink-0 mt-1 transition-transform duration-200 text-brand-dark/30 ${isSelected ? "rotate-90 text-brand-red" : ""}`}
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
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-red border border-brand-red px-3 py-1.5 hover:bg-brand-red hover:text-white transition-colors"
                        >
                          Get Directions <ExternalLink size={11} />
                        </a>
                        {(store as any).deliveryUrl && (
                          <a
                            href={(store as any).deliveryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-xs font-bold bg-brand-red text-white px-3 py-1.5 hover:bg-brand-red/90 transition-colors"
                          >
                            🚗 Order Delivery
                          </a>
                        )}
                        <Link href="/menu" onClick={e => e.stopPropagation()}>
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-brand-dark text-white px-3 py-1.5 hover:bg-brand-dark/80 transition-colors cursor-pointer">
                            🛒 Order Pickup
                          </span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Map */}
          <div className="lg:col-span-3 overflow-hidden border border-gray-200 shadow-lg"
            style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}>
            <MapView onMapReady={handleMapReadyFull} />
          </div>
        </div>
      </div>

      {/* Footer strip */}
      <div className="bg-brand-dark text-white py-8 mt-8">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-serif text-xl mb-1">Can't find a store near you?</p>
            <p className="text-white/50 text-sm">We're expanding across Tasmania. Enquire about franchise opportunities.</p>
          </div>
          <Link href="/franchise">
            <span className="inline-flex items-center gap-2 bg-brand-red text-white px-6 py-3 font-semibold text-sm hover:bg-brand-red/90 transition-colors cursor-pointer">
              Franchise Enquiry
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
