import supabase from '@/lib/supabase/client';
import type { SettingRow } from '@/pages/Settings/types';

function normalizeRows(rows: SettingRow[]): SettingRow[] {
  return rows
    .map((row) => ({
      key: row.key.trim(),
      value: row.value,
    }))
    .filter((row) => row.key.length > 0);
}

export async function fetchSettings(): Promise<SettingRow[]> {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .order('key');

  if (error) throw error;

  return (data ?? []).map((row) => ({
    key: row.key,
    value: row.value,
  }));
}

export async function saveSettings(rows: SettingRow[]): Promise<void> {
  const normalized = normalizeRows(rows);
  const keys = normalized.map((row) => row.key);

  if (new Set(keys).size !== keys.length) {
    throw new Error('Duplicate setting keys are not allowed.');
  }

  const { data: existing, error: fetchError } = await supabase
    .from('settings')
    .select('key');

  if (fetchError) throw fetchError;

  const existingKeys = new Set((existing ?? []).map((row) => row.key));
  const nextKeys = new Set(keys);
  const keysToDelete = [...existingKeys].filter((key) => !nextKeys.has(key));

  if (keysToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('settings')
      .delete()
      .in('key', keysToDelete);

    if (deleteError) throw deleteError;
  }

  if (normalized.length === 0) {
    return;
  }

  const { error: upsertError } = await supabase
    .from('settings')
    .upsert(normalized, { onConflict: 'key' });

  if (upsertError) throw upsertError;
}
