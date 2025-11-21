"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import {
  appReady,
  getThemeName,
  isMicroApp,
  getUserInfo,
} from "@dootask/tools";
import { normalizeUserId } from "@/lib/utils/user-id";

export default function DooTaskBridge() {
  const { setTheme } = useTheme();
  useEffect(() => {
    async function syncThemeAndUser() {
      try {
        const micro = await isMicroApp();
        if (!micro) return;

        await appReady();
        const theme = await getThemeName();
        setTheme(theme.includes("dark") ? "dark" : "light");

        const user = await getUserInfo();
        const normalizedId = normalizeUserId((user as { userid?: unknown })?.userid);
        if (normalizedId === null) return;

        const payload = {
          id: normalizedId,
          nickname: (user as { nickname?: string })?.nickname,
          email: (user as { email?: string })?.email,
        };
        sessionStorage.setItem("asset-hub:dootask-user", JSON.stringify(payload));
        window.dispatchEvent(new CustomEvent("asset-hub:user-updated", { detail: payload }));
      } catch {
        // Ignore errors when运行在独立模式
      }
    }

    syncThemeAndUser();
  }, [setTheme]);

  return null;
}
