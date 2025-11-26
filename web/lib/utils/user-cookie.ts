import { normalizeUserId } from "@/lib/utils/user-id";

export const USER_COOKIE_NAME = "asset_hub_user";

export type UserCookiePayload = {
  id: number;
  nickname?: string;
  email?: string;
  token?: string;
};

function encodeJson(value: unknown) {
  return encodeURIComponent(JSON.stringify(value));
}

function decodeJson<T>(raw: string): T | null {
  try {
    return JSON.parse(decodeURIComponent(raw)) as T;
  } catch {
    return null;
  }
}

export function parseUserCookieValue(
  raw?: string | null,
): UserCookiePayload | null {
  if (!raw) return null;
  const parsed = decodeJson<Partial<UserCookiePayload>>(raw);
  if (!parsed) return null;
  const normalizedId = normalizeUserId(parsed.id);
  if (normalizedId === null) {
    return null;
  }

  return {
    id: normalizedId,
    nickname: typeof parsed.nickname === "string" ? parsed.nickname : undefined,
    email: typeof parsed.email === "string" ? parsed.email : undefined,
    token: typeof parsed.token === "string" ? parsed.token : undefined,
  };
}

export function serializeUserCookieValue(payload: UserCookiePayload) {
  return encodeJson(payload);
}

export function getCookieValueFromString(
  cookieString: string | null | undefined,
  name: string,
): string | null {
  if (!cookieString) return null;
  const segments = cookieString.split(";");
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && key === name) {
      return rest.join("=").trim() || "";
    }
  }
  return null;
}

export function readUserCookieFromString(
  cookieString: string | null | undefined,
): UserCookiePayload | null {
  return parseUserCookieValue(
    getCookieValueFromString(cookieString, USER_COOKIE_NAME),
  );
}

export function readBrowserUserCookie(): UserCookiePayload | null {
  if (typeof document === "undefined") return null;
  return readUserCookieFromString(document.cookie);
}

export function writeBrowserUserCookie(
  payload: UserCookiePayload | null,
): void {
  if (typeof document === "undefined") return;
  const path = "/apps/asset-hub";
  const sameSite = "Lax";
  const isSecure =
    typeof window !== "undefined"
      ? window.location.protocol === "https:"
      : false;

  if (!payload) {
    document.cookie = `${USER_COOKIE_NAME}=; Path=${path}; SameSite=${sameSite}${isSecure ? "; Secure" : ""}; Max-Age=0`;
    return;
  }

  const encoded = serializeUserCookieValue(payload);
  document.cookie = `${USER_COOKIE_NAME}=${encoded}; Path=${path}; SameSite=${sameSite}${isSecure ? "; Secure" : ""}`;
}


