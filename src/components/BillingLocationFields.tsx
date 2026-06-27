"use client";

import type { ReactNode } from "react";
import { useEffect, useId } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BILLING_COUNTRY_SUGGESTIONS,
  isBillingCountryAustralia,
} from "@/lib/billing-address";
import { getBillingAustralianStateOptions } from "@/lib/wholesale-b2b-order";
import { DEFAULT_AUSTRALIAN_STATE_CODE } from "@/types/WholesaleB2BOrder";

export type BillingLocationFieldsVariant = "primary" | "emerald";

type BillingLocationFieldsProps = {
  variant: BillingLocationFieldsVariant;
  country: string;
  state: string;
  onCountryChange: (country: string) => void;
  onStateChange: (state: string) => void;
  disabled?: boolean;
};

const variantStyles: Record<
  BillingLocationFieldsVariant,
  {
    fieldClass: string;
    selectTriggerClass: string;
    selectIconClass: string;
    selectContentClass: string;
    selectItemClass: string;
  }
> = {
  primary: {
    fieldClass:
      "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40",
    selectTriggerClass:
      "h-10 w-full border-white/15 bg-black/40 text-white shadow-none focus-visible:border-primary/50 focus-visible:ring-primary/30 [&>span]:text-white",
    selectIconClass: "text-white/60",
    selectContentClass:
      "z-[60] border-white/15 bg-[#121212] text-white shadow-2xl",
    selectItemClass:
      "text-white focus:bg-white/10 data-[highlighted]:bg-white/10",
  },
  emerald: {
    fieldClass:
      "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/40",
    selectTriggerClass:
      "h-10 w-full border-white/15 bg-black/40 text-white shadow-none focus-visible:border-emerald-400/50 focus-visible:ring-emerald-400/30 [&>span]:text-white",
    selectIconClass: "text-white/60",
    selectContentClass:
      "z-[60] border-white/15 bg-[#121212] text-white shadow-2xl",
    selectItemClass:
      "text-white focus:bg-white/10 data-[highlighted]:bg-white/10",
  },
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function BillingLocationFields({
  variant,
  country,
  state,
  onCountryChange,
  onStateChange,
  disabled = false,
}: BillingLocationFieldsProps) {
  const styles = variantStyles[variant];
  const countryListId = useId();
  const isAustralia = isBillingCountryAustralia(country);
  const stateOptions = getBillingAustralianStateOptions();
  const australiaStateValue = stateOptions.some((option) => option.value === state)
    ? state
    : DEFAULT_AUSTRALIAN_STATE_CODE;

  useEffect(() => {
    if (!isAustralia) return;
    if (!stateOptions.some((option) => option.value === state)) {
      onStateChange(DEFAULT_AUSTRALIAN_STATE_CODE);
    }
    // stateOptions is derived from a static AU state list.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- normalize invalid AU codes only
  }, [isAustralia, onStateChange, state]);

  return (
    <>
      <Field label="Country">
        <input
          className={styles.fieldClass}
          list={countryListId}
          value={country}
          onChange={(event) => onCountryChange(event.target.value)}
          placeholder="Australia or enter country"
          disabled={disabled}
        />
        <datalist id={countryListId}>
          {BILLING_COUNTRY_SUGGESTIONS.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </Field>

      {isAustralia ? (
        <Field label="State">
          <Select
            value={australiaStateValue}
            onValueChange={onStateChange}
            disabled={disabled}
          >
            <SelectTrigger
              className={styles.selectTriggerClass}
              iconClassName={styles.selectIconClass}
            >
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent className={styles.selectContentClass}>
              {stateOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className={styles.selectItemClass}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : (
        <Field label="State / province / region">
          <input
            className={styles.fieldClass}
            value={state}
            onChange={(event) => onStateChange(event.target.value)}
            placeholder="Enter state or region"
            disabled={disabled}
          />
        </Field>
      )}
    </>
  );
}
