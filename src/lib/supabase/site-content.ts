import "server-only";

import { CACHE_TAGS, LONG_REVALIDATE_SECONDS } from "@/config";
import type { LocalizationValue, SiteContentSnapshot } from "@/types";
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "./server";

const LOCALIZATION_FILE_PATH = "localization.json";
const SERVER_BOOT_CACHE_BUSTER = `${process.pid}-${Date.now()}`;

const EMPTY_SNAPSHOT: SiteContentSnapshot = {
  settings: {},
  localization: {},
  loadedAt: new Date(0).toISOString(),
};

let lastKnownSnapshot: SiteContentSnapshot = EMPTY_SNAPSHOT;

function getStorageBucket(): string {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;
  if (!bucket) {
    throw new Error("NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET is not set");
  }
  return bucket;
}

function normalizeLocalization(raw: unknown): Record<string, LocalizationValue> {
  if (Array.isArray(raw)) {
    return raw.reduce<Record<string, LocalizationValue>>((acc, entry) => {
      if (!entry || typeof entry !== "object") return acc;
      const key = String((entry as Record<string, unknown>).key ?? "").trim();
      if (!key) return acc;

      const translations = (entry as Record<string, unknown>).translations;
      if (translations && typeof translations === "object" && !Array.isArray(translations)) {
        acc[key] = translations as Record<string, unknown>;
        return acc;
      }

      acc[key] = String((entry as Record<string, unknown>).value ?? "");
      return acc;
    }, {});
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, LocalizationValue>;
  }

  return {};
}

async function readJsonFileFromStorage(path: string): Promise<unknown | null> {
  const supabase = createServerSupabaseClient();
  const bucket = getStorageBucket();

  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    if (
      error.message === "Not found" ||
      error.message === "{}" ||
      error.message === "The resource was not found"
    ) {
      return null;
    }
    throw new Error(`${path}: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const text = await data.text();
  if (!text.trim()) {
    return null;
  }

  return JSON.parse(text);
}

async function fetchSettingsFromDb(): Promise<Record<string, string>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("settings").select("key, value");

  if (error) {
    throw new Error(`settings: ${error.message}`);
  }

  return (data ?? []).reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

async function fetchSiteContentUncached(): Promise<SiteContentSnapshot> {
  try {
    const [settings, localizationRaw] = await Promise.all([
      fetchSettingsFromDb(),
      readJsonFileFromStorage(LOCALIZATION_FILE_PATH),
    ]);

    const snapshot: SiteContentSnapshot = {
      settings,
      localization: localizationRaw
        ? normalizeLocalization(localizationRaw)
        : lastKnownSnapshot.localization,
      loadedAt: new Date().toISOString(),
    };

    lastKnownSnapshot = snapshot;
    return snapshot;
  } catch {
    return lastKnownSnapshot;
  }
}

const getCachedSiteContentSnapshot = unstable_cache(
  fetchSiteContentUncached,
  ["site-content", SERVER_BOOT_CACHE_BUSTER],
  {
    revalidate: LONG_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.settings, CACHE_TAGS.localization],
  },
);

export async function getSiteContentSnapshot(): Promise<SiteContentSnapshot> {
  return getCachedSiteContentSnapshot();
}
