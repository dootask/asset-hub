"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";

export function ThemeSync() {
  const searchParams = useSearchParams();
  const { setTheme } = useTheme();
  const themeParam = searchParams.get("theme");

  useEffect(() => {
    if (themeParam) {
      const nextTheme = themeParam.toLowerCase().includes("dark")
        ? "dark"
        : "light";
      setTheme(nextTheme);
    }
  }, [themeParam, setTheme]);

  return null;
}

