"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import DooTaskBridge from "@/components/providers/DooTaskBridge";
import { normalizeUserId } from "@/lib/utils/user-id";

const BASE_PATH = "/apps/asset-hub";
const USER_STORAGE_KEY = "asset-hub:dootask-user";
const USER_EVENT = "asset-hub:user-updated";

type SessionUser = {
  id: number;
  nickname?: string;
  email?: string;
};

const NAV_ITEMS = [
  { href: "/", match: "/", key: "dashboard" },
  { href: "/approvals", match: "/approvals", key: "approvals" },
  { href: "/assets/list", match: "/assets", key: "assets" },
  { href: "/system", match: "/system", key: "system" },
  { href: "/about", match: "/about", key: "about" },
] as const;

type Props = {
  children: React.ReactNode;
  locale: string;
  adminUserIds: number[];
};

export default function AppShell({ children, locale, adminUserIds }: Props) {
  const pathname = usePathname() || "/";
  const tNav = useTranslations("Nav");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [userReady, setUserReady] = useState(false);
  const pathWithoutBase = pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length) || "/"
    : pathname;
  const localeBase = `/${locale}`;
  const normalizedPathname =
    pathWithoutBase.startsWith(localeBase) && pathWithoutBase !== localeBase
      ? pathWithoutBase.slice(localeBase.length) || "/"
      : pathWithoutBase === localeBase
        ? "/"
        : pathWithoutBase;

  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item: { href: string; match: string; key: string }) => ({
        ...item,
        label: tNav(item.key),
      })),
    [tNav],
  );

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en-US";
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const readStoredUser = () => {
      try {
        const stored = sessionStorage.getItem(USER_STORAGE_KEY);
        if (!stored) {
          setSessionUser(null);
          setUserReady(true);
          return;
        }
        const parsed = JSON.parse(stored) as SessionUser;
        const normalizedId = normalizeUserId(parsed?.id);
        if (normalizedId === null) {
          setSessionUser(null);
          setUserReady(true);
          return;
        }
        setSessionUser({ ...parsed, id: normalizedId });
        setUserReady(true);
      } catch {
        setSessionUser(null);
        setUserReady(true);
      }
    };

    readStoredUser();

    const handleUserUpdated = (event: Event) => {
      const detail = (event as CustomEvent<SessionUser | null>).detail;
      const normalizedId = normalizeUserId(detail?.id);
      if (normalizedId !== null) {
        setSessionUser(detail ? { ...detail, id: normalizedId } : null);
        setUserReady(true);
        return;
      }
      readStoredUser();
    };

    window.addEventListener(USER_EVENT, handleUserUpdated);
    return () => {
      window.removeEventListener(USER_EVENT, handleUserUpdated);
    };
  }, []);

  const showSystemNav =
    adminUserIds.length === 0 ||
    (userReady &&
      sessionUser?.id !== undefined &&
      adminUserIds.includes(sessionUser.id));

  const visibleNavItems = navItems.filter(
    (item) => item.key !== "system" || showSystemNav,
  );

  return (
    <div className="min-h-screen bg-background transition-colors">
      <DooTaskBridge />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-6 py-6">
        <aside className="hidden w-60 flex-shrink-0 flex-col rounded-3xl border bg-card/60 p-5 shadow-sm lg:flex lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <div className="mb-6">
            <p className="text-xs text-muted-foreground">
              {locale === "zh" ? "快速导航" : "Navigation"}
            </p>
          </div>
          <nav className="flex flex-1 flex-col gap-2">
            {visibleNavItems.map((item) => {
              const matchPath = item.match ?? item.href;
              const active =
                normalizedPathname === item.href ||
                (item.match &&
                  item.match !== "/" &&
                  normalizedPathname.startsWith(matchPath));

              return (
                <Link
                  key={item.href}
                  href={`/${locale}${item.href}`}
                  className={clsx(
                    "rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {sessionUser && (
            <div className="mt-6 rounded-2xl border border-dashed px-4 py-2.5 text-xs text-muted-foreground">
              <p className="mt-1 text-sm font-medium text-foreground">
                {sessionUser.nickname ?? sessionUser.id}
              </p>
              {sessionUser.email && (
                <p className="text-xs text-muted-foreground">{sessionUser.email}</p>
              )}
            </div>
          )}
        </aside>

        <div className="flex flex-1 flex-col gap-5">
          <header className="rounded-3xl border bg-card px-6 py-5 shadow-sm">
            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Asset Hub
              </p>
              <h1 className="text-2xl font-semibold">
                {locale === "zh" ? "资产管理插件" : "Asset Management Plugin"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {locale === "zh"
                  ? "覆盖资产全生命周期的 DooTask 插件"
                  : "A DooTask plugin for asset lifecycle management"}
              </p>
            </div>
            <nav className="mt-4 flex flex-wrap gap-2 lg:hidden">
            {visibleNavItems.map((item) => {
                const matchPath = item.match ?? item.href;
                const active =
                  normalizedPathname === item.href ||
                  (item.match &&
                    item.match !== "/" &&
                    normalizedPathname.startsWith(matchPath));

                return (
                  <Link
                    key={`mobile-${item.href}`}
                    href={`/${locale}${item.href}`}
                    className={clsx(
                      "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="flex-1 rounded-3xl border bg-card p-6 shadow-sm">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
