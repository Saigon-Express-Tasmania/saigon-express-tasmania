"use client";

import { Check, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoreLocation } from "@/types";

export default function PickupStorePicker({
  stores,
  selectedId,
  onSelect,
  variant = "primary",
}: {
  stores: StoreLocation[];
  selectedId: number | null;
  onSelect: (storeId: number) => void;
  variant?: "primary" | "emerald";
}) {
  const isEmerald = variant === "emerald";
  if (stores.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/45">
        No pickup locations are available right now.
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {stores.map((store) => {
        const selected = selectedId === store.id;
        return (
          <button
            key={store.id}
            type="button"
            onClick={() => onSelect(store.id)}
            className={cn(
              "group relative flex w-full flex-col gap-2 rounded-xl border p-4 text-left transition-all",
              selected
                ? isEmerald
                  ? "border-emerald-400/70 bg-emerald-500/10 ring-1 ring-emerald-400/40"
                  : "border-primary/70 bg-primary/10 ring-1 ring-primary/40"
                : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/[0.07]",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                    selected
                      ? isEmerald
                        ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-400"
                        : "border-primary/50 bg-primary/20 text-primary"
                      : "border-white/10 bg-black/30 text-white/45 group-hover:text-white/70",
                  )}
                >
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{store.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">
                    {store.address}
                    {store.suburb ? `, ${store.suburb}` : ""}
                  </p>
                </div>
              </div>
              {selected ? (
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white",
                    isEmerald ? "bg-emerald-500" : "bg-primary",
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </div>
            {store.phone ? (
              <p className="flex items-center gap-1.5 pl-10 text-xs text-white/35">
                <Phone className="h-3 w-3 shrink-0" />
                {store.phone}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
