"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import {
  appReady,
  getThemeName,
  isMicroApp,
  getUserInfo,
  getBaseUrl,
  getUserToken,
} from "@dootask/tools";
import { normalizeUserId } from "@/lib/utils/user-id";
import {
  dispatchAuthEvent,
  setStoredAuth,
  setStoredBaseUrl,
  setStoredLocale,
  type StoredAuth,
} from "@/lib/utils/auth-storage";

export default function DooTaskBridge({ locale }: { locale?: string } = {}) {
  const { setTheme } = useTheme();
  useEffect(() => {
    async function syncThemeAndUser() {
      try {
        const micro = await isMicroApp();
        if (!micro) return;

        await appReady();
        const theme = await getThemeName();
        setTheme(theme.includes("dark") ? "dark" : "light");

        const [user, token, baseUrl] = await Promise.all([
          getUserInfo(),
          getUserToken().catch(() => null),
          getBaseUrl().catch(() => null),
        ]);
        const normalizedId = normalizeUserId((user as { userid?: unknown })?.userid);
        const authPayload: StoredAuth | null =
          normalizedId === null
            ? null
            : {
                userId: String(normalizedId),
                nickname: (user as { nickname?: string })?.nickname,
                email: (user as { email?: string })?.email,
                token:
                  token ??
                  (user as { token?: string })?.token ??
                  (user as { user_token?: string })?.user_token,
                locale,
                baseUrl:
                  typeof baseUrl === "string" && baseUrl.trim()
                    ? baseUrl.trim()
                    : undefined,
              };

        setStoredAuth(authPayload);
        setStoredLocale(authPayload?.locale ?? null);
        setStoredBaseUrl(authPayload?.baseUrl ?? null);
        dispatchAuthEvent(authPayload);
      } catch {
        // Ignore errors when运行在独立模式
      }
    }

    syncThemeAndUser();
  }, [setTheme, locale]);

  return null;
}
