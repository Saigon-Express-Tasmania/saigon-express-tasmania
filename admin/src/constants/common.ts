import { type LanguageKey } from '@/types';
import type Handsontable from 'handsontable';

export const DEFAULT_LANGUAGE: LanguageKey = 'en';
export const SUPPORTED_LANGUAGES: LanguageKey[] = [
  'en',
  'vi',
];
export const LANGUAGE_LABELS: Record<LanguageKey, string> = {
  en: 'English',
  vi: 'Vietnamese',
};

export const MASTER_DATA_MANIFEST_FILE_NAME = 'manifest.json';
export const LOCALIZATION_FILE_NAME = 'localization';
export const SETTINGS_FILE_NAME = 'settings';

export const DEFAULT_HANDSON_TABLE_OPTIONS: Handsontable.GridSettings = {
  data: [],
  rowHeaders: true,
  height: '100%',
  contextMenu: {
    items: {
      row_above: { name: 'Insert row above' },
      row_below: { name: 'Insert row below' },
      hsep1: '---------',
      remove_row: { name: 'Delete row' },
      hsep2: '---------',
      copy: { name: 'Copy' },
      paste: { name: 'Paste' },
    },
  },
  licenseKey: 'non-commercial-and-evaluation',
  stretchH: 'all',
  manualColumnResize: true,
  themeName: 'ht-theme-main',
};
