import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { normalizeLocale } from "@/lib/i18n";

const BASE_PATH = "/apps/asset-hub";

function isSystemPath(path: string) {
  return (
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path === "/favicon.ico" ||
    path.startsWith("/favicon")
  );
}

export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  if (!nextUrl.pathname.startsWith(BASE_PATH)) {
    return NextResponse.next();
  }

  const pathAfterBase = nextUrl.pathname.slice(BASE_PATH.length) || "/";

  if (isSystemPath(pathAfterBase)) {
    return NextResponse.next();
  }

  const segments = pathAfterBase.split("/").filter(Boolean);
  const [localeSegment] = segments;

  if (!localeSegment) {
    const langQuery = nextUrl.searchParams.get("lang");
    const normalized = normalizeLocale(langQuery);
    const redirectUrl = new URL(
      `${BASE_PATH}/${normalized}`,
      request.url,
    );
    nextUrl.searchParams.forEach((value, key) => {
      if (key !== "lang") {
        redirectUrl.searchParams.set(key, value);
      }
    });
    return NextResponse.redirect(redirectUrl);
  }

  const normalized = normalizeLocale(localeSegment);
  if (normalized !== localeSegment) {
    const remainder = segments.slice(1).join("/");
    const redirectPath = `${BASE_PATH}/${normalized}${
      remainder ? `/${remainder}` : ""
    }`;
    const url = new URL(redirectPath, request.url);
    nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/apps/asset-hub/:path*"],
};

