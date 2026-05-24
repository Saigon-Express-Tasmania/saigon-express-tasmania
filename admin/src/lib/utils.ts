import { LANGUAGE_LABELS } from '@/constants';
import type { LanguageKey } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function languageKeyToLabel(languageKey: LanguageKey): string {
  return LANGUAGE_LABELS[languageKey] || languageKey;
}
