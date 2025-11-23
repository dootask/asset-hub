import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

type UserContext = {
  userId?: string;
  token?: string;
  nickname?: string;
};

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

function encodeHeaderValue(value: string) {
  try {
    return encodeURIComponent(value);
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
    return attachUserHeaders(config, context);
  });
  return client;
}

async function createServerClient(): Promise<AxiosInstance> {
  const { getRequestBaseUrl } = await import("@/lib/utils/server-url");
  const baseURL = await getRequestBaseUrl();
  const client = axios.create({ baseURL });
  client.interceptors.request.use((config) => attachUserHeaders(config, {}));
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
