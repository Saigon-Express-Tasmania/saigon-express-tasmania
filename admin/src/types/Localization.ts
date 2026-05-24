import type { LanguageKey } from './common';

export type LocalizationTranslationType = {
  key: string;
  translations: Record<LanguageKey, string>;
};
