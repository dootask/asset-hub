import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  getStoredAuth,
  getStoredBaseUrl,
  getStoredLocale,
} from "@/lib/utils/auth-storage";

type UserContext = {
  userId?: string;
  token?: string;
  nickname?: string;
  email?: string;
  baseUrl?: string;
  locale?: string;
};

function encodeHeaderValue(value: string) {
  try {
    return encodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeHeaderValue(value?: string | null) {
  if (!value) {
    return undefined;
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function attachUserHeaders(
  config: InternalAxiosRequestConfig,
  context: UserContext,
): InternalAxiosRequestConfig {
  config.headers = config.headers ?? {};

  if (context.userId) {
    config.headers["x-user-id"] ??= `${context.userId}`;
  }

  if (context.token) {
    config.headers["x-user-token"] ??= context.token;
  }

  if (context.nickname) {
    config.headers["x-user-nickname"] ??= encodeHeaderValue(context.nickname);
  }

  if (context.email) {
    config.headers["x-user-email"] ??= context.email;
  }

  if (context.baseUrl) {
    config.headers["x-base-url"] ??= context.baseUrl;
  }

  if (context.locale) {
    config.headers["x-user-locale"] ??= context.locale;
  }

  return config;
}

let browserClient: AxiosInstance | null = null;

function createBrowserClient(): AxiosInstance {
  const baseURL = typeof window !== "undefined" ? window.location.origin : undefined;
  const client = axios.create({ baseURL });
  client.interceptors.request.use((config) => {
    const stored = getStoredAuth();
    const context: UserContext = {
      userId: stored?.userId,
      token: stored?.token,
      nickname: stored?.nickname,
      email: stored?.email,
      baseUrl: stored?.baseUrl ?? getStoredBaseUrl() ?? undefined,
      locale: stored?.locale ?? getStoredLocale() ?? "en",
    };
    return attachUserHeaders(config, context);
  });
  return client;
}

async function createServerClient(): Promise<AxiosInstance> {
  const preset = process.env.ASSET_HUB_BASE_URL ?? process.env.NEXT_PUBLIC_ASSET_HUB_BASE_URL;
  const baseURL = (preset ? preset.replace(/\/$/, "") : "http://127.0.0.1:3000");
  const { headers } = await import("next/headers");
  const incomingHeaders = await headers();
  const context: UserContext = {
    userId: incomingHeaders.get("x-user-id") ?? undefined,
    token: incomingHeaders.get("x-user-token") ?? undefined,
    nickname: decodeHeaderValue(incomingHeaders.get("x-user-nickname")) ?? undefined,
    email: incomingHeaders.get("x-user-email") ?? undefined,
    baseUrl: incomingHeaders.get("x-base-url") ?? undefined,
    locale: incomingHeaders.get("x-user-locale") ?? undefined,
  };
  const client = axios.create({ baseURL });
  client.interceptors.request.use((config) => {
    const url = config.url ?? "";
    const target = typeof url === "string" ? url : "";
    const isProtectedApi =
      target.startsWith("/apps/asset-hub/api") ||
      target.startsWith("apps/asset-hub/api");
    if (isProtectedApi && !context.userId) {
      throw new Error(
        "Authenticated API calls must be performed from the client with sessionStorage headers. Missing x-user-id on server.",
      );
    }
    return attachUserHeaders(config, context);
  });
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
