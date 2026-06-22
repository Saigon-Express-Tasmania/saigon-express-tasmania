"use client";

import { createContext, useContext } from "react";
import {
  DEFAULT_GST_TAX_RATE,
  DEFAULT_IS_GST_INCLUSIVE,
} from "@/config/settings";
import type { CommerceTaxSettings } from "@/lib/gst";

const CommerceTaxContext = createContext<CommerceTaxSettings>({
  isGstInclusive: DEFAULT_IS_GST_INCLUSIVE,
  gstTaxRate: DEFAULT_GST_TAX_RATE,
});

export function CommerceTaxProvider({
  isGstInclusive,
  gstTaxRate,
  children,
}: CommerceTaxSettings & { children: React.ReactNode }) {
  return (
    <CommerceTaxContext.Provider value={{ isGstInclusive, gstTaxRate }}>
      {children}
    </CommerceTaxContext.Provider>
  );
}

export function useCommerceTax() {
  return useContext(CommerceTaxContext);
}
