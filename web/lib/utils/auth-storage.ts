"use client";

export type StoredAuth = {
  userId: string;
  email?: string;
  nickname?: string;
  token?: string;
  locale?: string;
  baseUrl?: string;
};

export const AUTH_EVENT = "asset-hub:user-updated";
const STORAGE_KEY = "asset-hub:auth";
const BASE_URL_KEY = "asset-hub:dootask-base-url";
const LOCALE_KEY = "asset-hub:locale";

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAuth>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.userId || typeof parsed.userId !== "string") return null;
    const auth: StoredAuth = {
      userId: parsed.userId,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      nickname: typeof parsed.nickname === "string" ? parsed.nickname : undefined,
      token: typeof parsed.token === "string" ? parsed.token : undefined,
      locale: typeof parsed.locale === "string" ? parsed.locale : undefined,
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : undefined,
    };
    return auth;
  } catch {
    return null;
  }
}

export function setStoredAuth(value: StoredAuth | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function getStoredBaseUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(BASE_URL_KEY);
  } catch {
    return null;
  }
}

export function setStoredBaseUrl(baseUrl: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (baseUrl) {
      sessionStorage.setItem(BASE_URL_KEY, baseUrl);
    } else {
      sessionStorage.removeItem(BASE_URL_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function setStoredLocale(locale: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (locale) {
      sessionStorage.setItem(LOCALE_KEY, locale);
    } else {
      sessionStorage.removeItem(LOCALE_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function getStoredLocale(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(LOCALE_KEY);
  } catch {
    return null;
  }
}

export function dispatchAuthEvent(payload: StoredAuth | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: payload }));
}
