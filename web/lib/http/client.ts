import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { normalizeUserId } from "@/lib/utils/user-id";
import {
  readBrowserUserCookie,
  readUserCookieFromString,
  serializeUserCookieValue,
  USER_COOKIE_NAME,
  type UserCookiePayload,
} from "@/lib/utils/user-cookie";

type UserContext = {
  userCookie?: UserCookiePayload | null;
};

function getServerFallbackUserId(): number | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  const raw = process.env.ASSET_HUB_ADMIN_USER_IDS;
  if (!raw) {
    return null;
  }
  const first = raw
    .split(",")
    .map((entry) => normalizeUserId(entry))
    .find((id): id is number => id !== null);
  return first ?? null;
}

function extractUserFromStorage(): UserContext {
  if (typeof window === "undefined") return {};
  try {
    const storedUser = readBrowserUserCookie();
    return storedUser ? { userCookie: storedUser } : {};
  } catch {
    return {};
  }
}

function buildCookieHeader(context: UserContext): string | null {
  const payload = context.userCookie;
  if (!payload) {
    return null;
  }
  const normalizedId = normalizeUserId(payload.id);
  if (normalizedId === null) {
    return null;
  }
  const encoded = serializeUserCookieValue({
    ...payload,
    id: normalizedId,
  });
  return `${USER_COOKIE_NAME}=${encoded}`;
}

function attachUserCookie(
  config: InternalAxiosRequestConfig,
  context: UserContext,
): InternalAxiosRequestConfig {
  const cookieHeader = buildCookieHeader(context);
  if (!cookieHeader) {
    return config;
  }
  config.headers = config.headers ?? {};
  const existing = config.headers.Cookie as string | undefined;
  config.headers.Cookie = existing ? `${existing}; ${cookieHeader}` : cookieHeader;
  return config;
}

let browserClient: AxiosInstance | null = null;

function createBrowserClient(): AxiosInstance {
  const baseURL = typeof window !== "undefined" ? window.location.origin : undefined;
  const client = axios.create({ baseURL });
  // 浏览器同源请求会自动携带 Cookie，这里无需额外注入用户头。
  extractUserFromStorage();
  return client;
}

async function createServerClient(): Promise<AxiosInstance> {
  const preset = process.env.ASSET_HUB_BASE_URL ?? process.env.NEXT_PUBLIC_ASSET_HUB_BASE_URL;
  const baseURL = (preset ? preset.replace(/\/$/, "") : "http://127.0.0.1:3000");
  const { headers } = await import("next/headers");
  const incomingHeaders = await headers();
  const cookieUser = readUserCookieFromString(incomingHeaders.get("cookie"));
  const fallbackId = getServerFallbackUserId();
  const context: UserContext = {
    userCookie:
      cookieUser ?? (fallbackId !== null ? { id: fallbackId } : null),
  };
  const client = axios.create({ baseURL });
  client.interceptors.request.use((config) =>
    attachUserCookie(config, context),
  );
  return client;
}

export async function getApiClient(): Promise<AxiosInstance> {
  if (typeof window === "undefined") {
    return createServerClient();
  }
  if (!browserClient) {
    browserClient = createBrowserClient();
  }
  return browserClient;
}
