"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import {
  appReady,
  getThemeName,
  isMicroApp,
  getUserInfo,
} from "@dootask/tools";

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
        if (user?.userid) {
          sessionStorage.setItem(
            "asset-hub:dootask-user",
            JSON.stringify({
              id: user.userid,
              nickname: user.nickname,
              email: user.email,
            }),
          );
        }
      } catch {
        // Ignore errors when运行在独立模式
      }
    }

    syncThemeAndUser();
  }, [setTheme]);

  return null;
}

