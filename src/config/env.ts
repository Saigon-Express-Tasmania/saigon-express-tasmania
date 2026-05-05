type RequiredEnvKey =
  | "APP_URL"
  | "DEFAULT_LOCALE"
  | "SUPPORTED_LOCALES";

function getEnv(key: RequiredEnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export const ENV = {
  appUrl: getEnv("APP_URL"),
  defaultLocale: getEnv("DEFAULT_LOCALE"),
  supportedLocales: getEnv("SUPPORTED_LOCALES").split(","),
} as const;

