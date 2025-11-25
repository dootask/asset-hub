import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

type UserContext = {
  userId?: string;
  token?: string;
  nickname?: string;
  baseUrl?: string;
  locale?: string;
};

function getServerFallbackUserId() {
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }
  const raw = process.env.ASSET_HUB_ADMIN_USER_IDS;
  if (!raw) {
    return undefined;
  }
  const first = raw
    .split(",")
    .map((entry) => entry.trim())
    .find(Boolean);
  return first;
}

function extractUserFromStorage(): UserContext {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem("asset-hub:dootask-user");
    const parsed = raw
      ? (JSON.parse(raw) as {
          id?: string | number;
          nickname?: string;
          token?: string;
        })
      : null;

    const baseUrl =
      sessionStorage.getItem("asset-hub:dootask-base-url") ?? undefined;
    const locale = sessionStorage.getItem("asset-hub:locale") ?? undefined;

    return parsed
      ? {
          userId:
            parsed.id !== undefined && parsed.id !== null
              ? String(parsed.id)
              : undefined,
          token: parsed.token ?? undefined,
          nickname: parsed.nickname ?? undefined,
          baseUrl: baseUrl ?? undefined,
          locale: locale ?? undefined,
        }
      : { baseUrl: baseUrl ?? undefined, locale: locale ?? undefined };
  } catch {
    return {};
  }
}

function detectLocaleFromDom() {
  if (typeof document === "undefined") return undefined;
  const lang = document.documentElement.lang;
  if (lang) return lang;
  return navigator.language?.split("-")?.[0];
}

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
  const baseURL =
    typeof window !== "undefined"
      ? window.location.origin
      : undefined;
  const client = axios.create({ baseURL });
  client.interceptors.request.use((config) => {
    const context = extractUserFromStorage();
    if (!context.locale) {
      context.locale = detectLocaleFromDom();
    }
    return attachUserHeaders(config, context);
  });
  return client;
}

async function createServerClient(): Promise<AxiosInstance> {
  const { getRequestBaseUrl } = await import("@/lib/utils/server-url");
  const baseURL = await getRequestBaseUrl();
  const { headers } = await import("next/headers");
  const incomingHeaders = await headers();
  const context: UserContext = {
    userId:
      incomingHeaders.get("x-user-id") ??
      getServerFallbackUserId() ??
      undefined,
    token: incomingHeaders.get("x-user-token") ?? undefined,
    nickname: decodeHeaderValue(incomingHeaders.get("x-user-nickname")),
    baseUrl: incomingHeaders.get("x-base-url") ?? undefined,
    locale: incomingHeaders.get("x-user-locale") ?? undefined,
  };
  const client = axios.create({ baseURL });
  client.interceptors.request.use((config) => attachUserHeaders(config, context));
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
