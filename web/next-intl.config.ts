import { getRequestConfig } from "next-intl/server";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  normalizeLocale,
} from "./lib/i18n";

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const resolvedLocale = locale ?? (await requestLocale);
  const normalized = normalizeLocale(resolvedLocale);

  return {
    locale: normalized,
    locales: Array.from(SUPPORTED_LOCALES),
    defaultLocale: DEFAULT_LOCALE,
    messages: (await import(`./messages/${normalized}.json`)).default,
  };
});
