import Link from "next/link";
import { getRequestBaseUrl } from "@/lib/utils/server-url";

async function fetchSummary() {
  const baseUrl = await getRequestBaseUrl();
  const response = await fetch(`${baseUrl}/apps/asset-hub/api/system/config`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return { assets: 0, companies: 0, roles: 0 };
  }
  const payload = (await response.json()) as {
    data: { assets: number; companies: number; roles: number };
  };
  return payload.data;
}

export default async function LocaleDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const summary = await fetchSummary();
  const { locale } = await params;
  const isChinese = locale === "zh";

  const cards = [
    {
      label: isChinese ? "资产总数" : "Assets",
      value: summary.assets,
      href: "/assets/list",
    },
    {
      label: isChinese ? "公司数量" : "Companies",
      value: summary.companies,
      href: "/system/company",
    },
    {
      label: isChinese ? "角色数量" : "Roles",
      value: summary.roles,
      href: "/system/role",
    },
  ];

  const shortcuts = [
    {
      label: isChinese ? "资产列表" : "Asset List",
      href: "/assets/list",
    },
    {
      label: isChinese ? "新增资产" : "New Asset",
      href: "/assets/new",
    },
    {
      label: isChinese ? "系统配置" : "System Settings",
      href: "/system/company",
    },
  ];

  const withLocale = (path: string) => `/${locale}${path}`;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Asset Hub
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {isChinese ? "资产全生命周期管理" : "Asset Lifecycle Overview"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isChinese
            ? "查看关键指标、快速进入常用模块。"
            : "Review key metrics and jump into frequent actions."}
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={withLocale(card.href)}
              className="rounded-2xl border bg-muted/30 px-4 py-5 text-center transition hover:border-primary/30"
            >
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-semibold">{card.value}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          {isChinese ? "快捷入口" : "Shortcuts"}
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {shortcuts.map((item) => (
            <Link
              key={item.href}
              href={withLocale(item.href)}
              className="rounded-full border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

