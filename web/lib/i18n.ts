export const SUPPORTED_LOCALES = ["en", "zh"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "en";

export function normalizeLocale(input?: string | null): SupportedLocale {
  if (!input) return DEFAULT_LOCALE;
  const lower = input.toLowerCase();
  if (lower.startsWith("zh")) {
    return "zh";
  }
  return SUPPORTED_LOCALES.includes(lower as SupportedLocale)
    ? (lower as SupportedLocale)
    : DEFAULT_LOCALE;
}

export function isSupportedLocale(input: string): input is SupportedLocale {
  return SUPPORTED_LOCALES.includes(input as SupportedLocale);
}

