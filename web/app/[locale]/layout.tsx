import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import AppShell from "@/components/layout/AppShell";
import { ThemeSync } from "@/components/providers/ThemeSync";
import { normalizeLocale, isSupportedLocale } from "@/lib/i18n";
import { appConfig } from "@/lib/config";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

async function loadMessages(locale: string) {
  return (await import(`../../messages/${locale}.json`)).default;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const normalizedLocale = normalizeLocale(locale);
  const isChinese = normalizedLocale === "zh";
  const title = isChinese
    ? "Asset Hub 资产管理插件"
    : "Asset Hub - Asset Management";
  const description = isChinese
    ? "覆盖资产全生命周期的 DooTask 插件，提供资产、系统、审批等能力。"
    : "DooTask plugin for end-to-end asset lifecycle management.";

  return {
    title,
    description,
  };
}

import { PermissionProvider } from "@/components/providers/PermissionProvider";

// ...

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  const normalizedLocale = normalizeLocale(locale);
  if (!isSupportedLocale(normalizedLocale)) {
    notFound();
  }

  const messages = await loadMessages(normalizedLocale);

  return (
    <NextIntlClientProvider locale={normalizedLocale} messages={messages}>
      <ThemeSync />
      <PermissionProvider
        adminUserIds={appConfig.permissions.adminUserIds}
        approverUserIds={appConfig.permissions.approverUserIds}
      >
        <AppShell locale={normalizedLocale}>
          {children}
        </AppShell>
      </PermissionProvider>
    </NextIntlClientProvider>
  );
}
