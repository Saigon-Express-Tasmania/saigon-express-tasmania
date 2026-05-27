export type LocalizationValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>;

export interface SiteContentSnapshot {
  settings: Record<string, string>;
  localization: Record<string, LocalizationValue>;
  loadedAt: string;
}
