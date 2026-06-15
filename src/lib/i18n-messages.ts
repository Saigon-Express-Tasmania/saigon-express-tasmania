import en from "../../messages/en.json";
import vi from "../../messages/vi.json";

export const APP_MESSAGES = {
  en,
  vi,
} as const;

export type AppLocale = keyof typeof APP_MESSAGES;
