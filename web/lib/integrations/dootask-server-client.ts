import { DooTaskClient } from "@dootask/tools";
import { extractUserFromRequest, type RequestUser } from "@/lib/utils/request-user";

type ClientContext = {
  token?: string | null;
  serverOrigin?: string | null;
};

export function resolveServerFromRequest(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return "http://nginx";
  }
  const baseFromHeader = request.headers.get("x-base-url");
  if (baseFromHeader) {
    try {
      return new URL(baseFromHeader).origin;
    } catch {
      return baseFromHeader;
    }
  }
  const origin = request.headers.get("origin");
  if (origin) {
    return origin;
  }
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) {
    return null;
  }
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export function createDooTaskClientFromContext(context: ClientContext) {
  const token = context.token?.trim();
  if (!token) {
    return null;
  }
  const server =
    process.env.NODE_ENV === "production"
      ? "http://nginx"
      : context.serverOrigin?.trim() || undefined;

  return new DooTaskClient({
    token,
    server,
    timeoutMs: 10_000,
  });
}

export function createDooTaskClientFromRequest(request: Request) {
  const user: RequestUser | null = extractUserFromRequest(request);
  const serverOrigin = resolveServerFromRequest(request);
  return createDooTaskClientFromContext({
    token: user?.token,
    serverOrigin,
  });
}
