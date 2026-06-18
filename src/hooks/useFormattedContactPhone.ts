"use client";

import { useMemo } from "react";
import { useSiteSetting } from "@/contexts/SiteContentContext";
import { formatAustralianPhone } from "@/lib/australian-phone";

export function useFormattedContactPhone() {
  const raw = useSiteSetting("contact_us_phone_number");
  return useMemo(() => formatAustralianPhone(raw), [raw]);
}
