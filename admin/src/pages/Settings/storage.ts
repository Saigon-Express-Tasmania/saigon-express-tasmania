import { SETTINGS_FILE_NAME, STORAGE_BUCKET } from '@/constants';
import supabase from '@/lib/supabase/client';
import type { SettingRow } from './types';

const SETTINGS_FILE_PATH = `${SETTINGS_FILE_NAME}.json`;

function normalizeSettingRows(raw: unknown): SettingRow[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((item) => typeof item === 'object' && item !== null)
      .map((item) => {
        const row = item as Record<string, unknown>;
        return {
          key: String(row.key ?? ''),
          value: String(row.value ?? ''),
        };
      });
  }

  if (typeof raw === 'object' && raw !== null) {
    return Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({
      key,
      value: String(value ?? ''),
    }));
  }

  return [];
}

export function settingsRowsToObject(rows: SettingRow[]): Record<string, string> {
  return rows.reduce<Record<string, string>>((acc, row) => {
    const normalizedKey = row.key.trim();
    if (!normalizedKey) return acc;
    acc[normalizedKey] = row.value;
    return acc;
  }, {});
}

export async function loadSettingsFromStorage(): Promise<SettingRow[]> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(SETTINGS_FILE_PATH);

  if (
    error &&
    error.message !== 'Not found' &&
    error.message !== '{}' &&
    error.message !== 'The resource was not found'
  ) {
    throw error;
  }

  if (!data) {
    return [];
  }

  const text = await data.text();
  const parsed = JSON.parse(text);
  return normalizeSettingRows(parsed);
}

export async function saveSettingsToStorage(rows: SettingRow[]): Promise<void> {
  const payload = settingsRowsToObject(rows);
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(SETTINGS_FILE_PATH, JSON.stringify(payload, null, 2), {
      upsert: true,
      contentType: 'application/json',
    });

  if (error) {
    throw error;
  }
}
