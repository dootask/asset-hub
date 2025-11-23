import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { getRequestBaseUrl } from "@/lib/utils/server-url";

type UserContext = {
  userId?: string;
  token?: string;
  nickname?: string;
};

function extractUserFromSearch(search: string | null): UserContext {
  if (!search) return {};
  const params = new URLSearchParams(search);
  const userId =
    params.get("user_id") ?? params.get("userid") ?? params.get("userId");
  const token = params.get("user_token") ?? params.get("token");
  const nickname =
    params.get("user_nickname") ??
    params.get("nickname") ??
    params.get("userName");
  return {
    userId: userId ?? undefined,
    token: token ?? undefined,
    nickname: nickname ?? undefined,
  };
}

function extractUserFromStorage(): UserContext {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem("asset-hub:dootask-user");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as {
      id?: string | number;
      nickname?: string;
      token?: string;
    };
    return {
      userId:
        parsed.id !== undefined && parsed.id !== null
          ? String(parsed.id)
          : undefined,
      token: parsed.token ?? undefined,
      nickname: parsed.nickname ?? undefined,
    };
  } catch {
    return {};
  }
}

async function extractUserFromCookies(): Promise<UserContext> {
  try {
    const { cookies } = await import("next/headers");
    const store = cookies();
    return {
      userId: store.get("asset-hub-user-id")?.value,
      token: store.get("asset-hub-user-token")?.value,
    };
  } catch {
    return {};
  }
}

async function extractUserFromHeaders(): Promise<UserContext> {
  try {
    const { headers } = await import("next/headers");
    const headerStore = headers();
    const userId =
      headerStore.get("x-user-id") ??
      headerStore.get("x-dootask-user-id") ??
      headerStore.get("userid");
    const token =
      headerStore.get("x-user-token") ??
      headerStore.get("x-dootask-user-token") ??
      headerStore.get("token");
    const nickname =
      headerStore.get("x-user-nickname") ??
      headerStore.get("x-dootask-user-nickname") ??
      headerStore.get("nickname");
    return {
      userId: userId ?? undefined,
      token: token ?? undefined,
      nickname: nickname ?? undefined,
    };
  } catch {
    return {};
  }
}

function mergeUserContext(
  primary: UserContext,
  secondary: UserContext,
): UserContext {
  return {
    userId: primary.userId ?? secondary.userId,
    token: primary.token ?? secondary.token,
    nickname: primary.nickname ?? secondary.nickname,
  };
}

function attachUserHeaders(
  config: AxiosRequestConfig,
  context: UserContext,
): AxiosRequestConfig {
  if (!config.headers) {
    config.headers = {};
  }

  if (context.userId) {
    config.headers["x-user-id"] ??= `${context.userId}`;
    config.headers["x-dootask-user-id"] ??= `${context.userId}`;
  }

  if (context.token) {
    config.headers["x-user-token"] ??= context.token;
    config.headers["x-dootask-user-token"] ??= context.token;
  }

  if (context.nickname) {
    config.headers["x-user-nickname"] ??= context.nickname;
    config.headers["x-dootask-user-nickname"] ??= context.nickname;
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
    const fromUrl = extractUserFromSearch(
      typeof window !== "undefined" ? window.location.search : null,
    );
    const fromStorage = extractUserFromStorage();
    const context = mergeUserContext(fromUrl, fromStorage);
    return attachUserHeaders(config, context);
  });
  return client;
}

async function createServerClient(): Promise<AxiosInstance> {
  const baseURL = await getRequestBaseUrl();
  const client = axios.create({ baseURL });
  const [fromHeaders, fromCookies] = await Promise.all([
    extractUserFromHeaders(),
    extractUserFromCookies(),
  ]);
  const context = mergeUserContext(fromHeaders, fromCookies);
  client.interceptors.request.use((config) =>
    attachUserHeaders(config, context),
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
