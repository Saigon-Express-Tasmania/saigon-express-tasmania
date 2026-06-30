"use client";

import { useId, useMemo, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  buildDeliveryCityOptionKey,
  findDeliveryCity,
  formatDeliveryCityOptionLabel,
  formatDeliveryPostalCode,
} from "@/lib/delivery-cities";
import { cn } from "@/lib/utils";
import { FormFieldLabel } from "@/components/FormFieldLabel";
import type { DeliveryCity } from "@/types";

type DeliveryCitySelectProps = {
  label: string;
  cities: DeliveryCity[];
  deliveryOrigin: string;
  cityName: string;
  postalCode: string;
  onChange: (selection: { name: string; postalCode: string }) => void;
  placeholder?: string;
  triggerClassName?: string;
  contentClassName?: string;
  accentClassName?: string;
  required?: boolean;
  filled?: boolean;
};

export default function DeliveryCitySelect({
  label,
  cities,
  deliveryOrigin,
  cityName,
  postalCode,
  onChange,
  placeholder = "Search city or postal code…",
  triggerClassName,
  contentClassName,
  accentClassName = "text-emerald-400",
  required,
  filled,
}: DeliveryCitySelectProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);

  const selectedCity = useMemo(
    () => findDeliveryCity(cities, cityName, postalCode),
    [cities, cityName, postalCode],
  );

  const selectedKey = selectedCity
    ? buildDeliveryCityOptionKey(selectedCity)
    : "";

  return (
    <label className="block space-y-1.5">
      <FormFieldLabel label={label} required={required} filled={filled} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            className={cn(
              "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-left text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40",
              triggerClassName,
            )}
          >
            <span className={cn("truncate", !selectedCity && "text-white/30")}>
              {selectedCity
                ? formatDeliveryCityOptionLabel(selectedCity)
                : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/60" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn(
            "z-[60] w-[min(24rem,var(--radix-popover-trigger-width))] border-white/15 bg-[#121212] p-0 text-white shadow-2xl",
            contentClassName,
          )}
        >
          <p
            className="flex items-start gap-2 border-b border-amber-400/30 bg-amber-500/15 px-3 py-2.5 text-xs leading-relaxed text-amber-50/90"
            role="note"
          >
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            <span>
              <strong className="font-semibold text-white">Delivery area only.</strong>{" "}
              We deliver to nearby cities and suburbs around {deliveryOrigin}. If your
              suburb isn&apos;t listed, delivery isn&apos;t available.
            </span>
          </p>
          <Command
            id={listboxId}
            filter={(value, query) => {
              const [name, postal] = value.split("\u0000");
              const haystack = `${name} ${formatDeliveryPostalCode(postal)}`.toLowerCase();
              return haystack.includes(query.trim().toLowerCase()) ? 1 : 0;
            }}
            className="bg-transparent"
          >
            <div className="border-b border-white/10 px-3 py-2">
              <CommandInput
                placeholder="Type city or postcode…"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
            </div>
            <CommandList className="max-h-64 overflow-y-auto p-1">
              <CommandEmpty className="px-3 py-6 text-center text-sm text-white/45">
                No matching delivery suburbs.
              </CommandEmpty>
              <CommandGroup>
                {cities.map((city) => {
                  const optionKey = buildDeliveryCityOptionKey(city);
                  const isSelected = optionKey === selectedKey;

                  return (
                    <CommandItem
                      key={optionKey}
                      value={optionKey}
                      onSelect={() => {
                        onChange({
                          name: city.name,
                          postalCode: formatDeliveryPostalCode(city.postalCode),
                        });
                        setOpen(false);
                      }}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-white data-[selected=true]:bg-white/10"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          accentClassName,
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">
                        {formatDeliveryCityOptionLabel(city)}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </label>
  );
}
