"use client";

import { Providers } from "@/components/providers";
import type { SiteContentSnapshot, StoreLocation } from "@/types";
import { useEffect, useState, type ReactNode } from "react";

const EMPTY_SNAPSHOT: SiteContentSnapshot = {
  settings: {},
  localization: {},
  loadedAt: new Date(0).toISOString(),
};

type SiteChromePayload = {
  siteContent: SiteContentSnapshot;
  storeLocations: StoreLocation[];
};

let cachedPayload: SiteChromePayload | null = null;
let inflightPayload: Promise<SiteChromePayload> | null = null;

async function loadSiteChrome(): Promise<SiteChromePayload> {
  if (cachedPayload) {
    return cachedPayload;
  }

  if (!inflightPayload) {
    inflightPayload = fetch("/api/site-chrome", { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`site-chrome: ${response.status}`);
        }
        return response.json() as Promise<SiteChromePayload>;
      })
      .then((payload) => {
        cachedPayload = payload;
        return payload;
      })
      .finally(() => {
        inflightPayload = null;
      });
  }

  return inflightPayload;
}

type SiteChromeProvidersProps = {
  children: ReactNode;
};

export default function SiteChromeProviders({
  children,
}: SiteChromeProvidersProps) {
  const [payload, setPayload] = useState<SiteChromePayload | null>(
    cachedPayload,
  );

  useEffect(() => {
    if (cachedPayload) {
      return;
    }

    let cancelled = false;

    void loadSiteChrome()
      .then((nextPayload) => {
        if (!cancelled) {
          setPayload(nextPayload);
        }
      })
      .catch((error) => {
        console.error("Failed to load site chrome:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Providers
      siteContent={payload?.siteContent ?? EMPTY_SNAPSHOT}
      storeLocations={payload?.storeLocations ?? []}
    >
      {children}
    </Providers>
  );
}
