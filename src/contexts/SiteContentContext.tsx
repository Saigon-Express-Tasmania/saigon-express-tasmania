"use client";

import type { SiteContentSnapshot } from "@/types";
import { createContext, useContext } from "react";

const SiteContentContext = createContext<SiteContentSnapshot | null>(null);

interface SiteContentProviderProps {
  initialData: SiteContentSnapshot;
  children: React.ReactNode;
}

export function SiteContentProvider({ initialData, children }: SiteContentProviderProps) {
  return <SiteContentContext.Provider value={initialData}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent(): SiteContentSnapshot {
  const context = useContext(SiteContentContext);
  if (!context) {
    throw new Error("useSiteContent must be used within SiteContentProvider");
  }
  return context;
}

export function useSiteSetting(key: string): string | undefined {
  const { settings } = useSiteContent();
  return settings[key];
}
