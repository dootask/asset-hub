"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { isMicroApp, setCapsuleConfig } from "@dootask/tools";
import DooTaskBridge from "@/components/providers/DooTaskBridge";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/components/providers/PermissionProvider";

const BASE_PATH = "/apps/asset-hub";

const NAV_ITEMS = [
  { href: "/", match: "/", key: "dashboard" },
  { href: "/approvals", match: "/approvals", key: "approvals" },
  { href: "/assets", match: "/assets", key: "assets" },
  { href: "/consumables", match: "/consumables", key: "consumables" },
  { href: "/system", match: "/system", key: "system" },
  { href: "/help", match: "/help", key: "help" },
] as const;

type Props = {
  children: React.ReactNode;
  locale: string;
  currentUserId?: number | null;
};

export default function AppShell({
  children,
  locale,
}: Props) {
  const pathname = usePathname() || "/";
  const tNav = useTranslations("Nav");
  const { user: sessionUser, userReady, isAdmin } = usePermissions();
  const [isMicroEnv, setIsMicroEnv] = useState<boolean | null>(null);
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
    if (typeof window === "undefined" || !isMicroEnv) return;
    const handleResize = () => {
      const innerWidth = window.innerWidth;
      if (innerWidth > 1280) {
        setCapsuleConfig({
          top: 16,
          right: 16,
        })
      } else {
        setCapsuleConfig({
          top: 32,
          right: 34,
        })
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isMicroEnv]);

  useEffect(() => {
    let cancelled = false;
    async function checkMicroEnv() {
      try {
        const micro = await isMicroApp();
        if (!cancelled) {
          setIsMicroEnv(micro);
        }
      } catch {
        if (!cancelled) {
          setIsMicroEnv(false);
        }
      }
    }
    checkMicroEnv();
    return () => {
      cancelled = true;
    };
  }, []);

  const showSystemNav = isAdmin;

  const visibleNavItems = navItems.filter(
    (item) => item.key !== "system" || showSystemNav,
  );

  const loadingEnv = isMicroEnv === null;
  const isGuest = userReady && !sessionUser;
  const waitingUserReady = isMicroEnv === true && !userReady;

  const bridge = <DooTaskBridge />;

  if (loadingEnv || waitingUserReady) {
    return (
      <>
        {bridge}
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </>
    );
  }

  if (!loadingEnv && isMicroEnv === false) {
    return (
      <>
        {bridge}
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="max-w-md rounded-3xl border bg-card p-6 text-center shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Asset Hub
            </p>
            <h1 className="mt-3 text-xl font-semibold">
              {locale === "zh"
                ? "请在 DooTask 插件环境中打开"
                : "Open inside DooTask plugin"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {locale === "zh"
                ? "当前访问方式未检测到 DooTask 宿主环境。请从 DooTask 应用中心打开 Asset Hub 插件。"
                : "This app is intended to run as a DooTask plugin. Please launch Asset Hub from the DooTask app center."}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!loadingEnv && isMicroEnv && isGuest) {
    return (
      <>
        {bridge}
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="max-w-md rounded-3xl border bg-card p-6 text-center shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Asset Hub
            </p>
            <h1 className="mt-3 text-xl font-semibold">
              {locale === "zh"
                ? "禁止游客访问"
                : "Guest access is not allowed"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {locale === "zh"
                ? "未检测到有效的用户信息。请确认已登录 DooTask 后，通过插件入口重新访问 Asset Hub。"
                : "No valid user context is available. Please ensure you are logged in to DooTask and reopen Asset Hub from the plugin entry."}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors">
      {bridge}
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

        <div className="flex flex-1 flex-col gap-5 min-w-0">
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
