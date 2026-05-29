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

// Lazy getters so importing other @/config modules does not require env at module load
// (e.g. middleware/proxy edge bundling on Netlify).
export const ENV = {
  get appUrl() {
    return getEnv("APP_URL");
  },
  get defaultLocale() {
    return getEnv("DEFAULT_LOCALE");
  },
  get supportedLocales() {
    return getEnv("SUPPORTED_LOCALES").split(",");
  },
} as const;

