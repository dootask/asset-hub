import { getRequestConfig } from "next-intl/server";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  normalizeLocale,
} from "./lib/i18n";

const BASE_PATH = "/apps/asset-hub";

export default getRequestConfig(async ({ request }) => {
  const pathname = request?.nextUrl?.pathname ?? "/";
  let localeSegment: string | undefined;

  if (pathname.startsWith(BASE_PATH)) {
    const segments = pathname.slice(BASE_PATH.length).split("/").filter(Boolean);
    localeSegment = segments[0];
  }

  const locale = normalizeLocale(localeSegment);

  return {
    locale,
    locales: Array.from(SUPPORTED_LOCALES),
    defaultLocale: DEFAULT_LOCALE,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});

