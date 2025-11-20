import Link from "next/link";
import type { DashboardOverview } from "@/lib/repositories/analytics";
import { getRequestBaseUrl } from "@/lib/utils/server-url";
import {
  type AssetStatus,
  getAssetCategoryLabel,
  getAssetStatusLabel,
} from "@/lib/types/asset";
import { getOperationTypeLabel } from "@/lib/types/operation";

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

async function fetchOverview() {
  const baseUrl = await getRequestBaseUrl();
  const response = await fetch(
    `${baseUrl}/apps/asset-hub/api/reports/overview`,
    {
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const fallback: DashboardOverview = {
      assetsByStatus: [],
      assetsByCategory: [],
      approvalsByStatus: [],
      approvalsTrend: [],
      operationsByType: [],
      pendingApprovals: 0,
    };
    return fallback;
  }
  const payload = (await response.json()) as {
    data: DashboardOverview;
  };
  return payload.data;
}

export default async function LocaleDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, summary, overview] = await Promise.all([
    params,
    fetchSummary(),
    fetchOverview(),
  ]);
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
    {
      label: isChinese ? "待审批" : "Pending Approvals",
      value: overview.pendingApprovals,
      href: "/approvals?role=my-tasks",
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
    {
      label: isChinese ? "审批中心" : "Approvals",
      href: "/approvals",
    },
  ];

  const withLocale = (path: string) => `/${locale}${path}`;

  const assetStatusDistribution = overview.assetsByStatus.map((item) => ({
    ...item,
    label: getAssetStatusLabel(item.label as AssetStatus, locale),
  }));

  const assetCategoryDistribution = overview.assetsByCategory.map((item) => ({
    ...item,
    label: getAssetCategoryLabel(item.label, locale),
  }));

  const operationsByType = overview.operationsByType.map((item) => ({
    ...item,
    label: getOperationTypeLabel(item.label, locale),
  }));

  const renderDistribution = (
    titleZh: string,
    titleEn: string,
    items: Array<{ label: string; count: number }>,
  ) => {
    const total = items.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          {isChinese ? "暂无数据" : "No data"}
        </p>
      );
    }
    return (
      <ul className="space-y-4">
        {items.map((item) => {
          const percent = Math.round((item.count / total) * 100);
          return (
            <li key={item.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground">
                  {item.count} · {percent}%
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderTrend = () => {
    if (overview.approvalsTrend.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          {isChinese ? "暂无审批记录" : "No approvals yet"}
        </p>
      );
    }
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {overview.approvalsTrend.map((item) => (
          <div
            key={item.date}
            className="rounded-2xl border bg-card/50 p-3 text-sm"
          >
            <p className="text-xs text-muted-foreground">{item.date}</p>
            <p className="text-lg font-semibold">{item.count}</p>
          </div>
        ))}
      </div>
    );
  };

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
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          {isChinese ? "资产分布" : "Asset Distribution"}
        </h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              {isChinese ? "按状态" : "By Status"}
            </h3>
            <div className="mt-3">
              {renderDistribution("按状态", "By Status", assetStatusDistribution)}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              {isChinese ? "按类别（前 5）" : "Top Categories"}
            </h3>
            <div className="mt-3">
              {renderDistribution(
                "按类别",
                "By Category",
                assetCategoryDistribution,
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {isChinese ? "审批趋势" : "Approval Trend"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isChinese
                ? "最近 14 天的审批提交情况。"
                : "Submissions in the last 14 days."}
            </p>
          </div>
          <Link
            href={withLocale("/approvals")}
            className="rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {isChinese ? "查看全部审批" : "View approvals"}
          </Link>
        </div>
        <div className="mt-4">{renderTrend()}</div>
      </section>

      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {isChinese ? "操作统计" : "Ops Summary"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isChinese
                ? "近 30 天各操作类型的数量。"
                : "Operations by type in the last 30 days."}
            </p>
          </div>
          <Link
            href={withLocale("/assets/list")}
            className="rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {isChinese ? "查看资产列表" : "View assets"}
          </Link>
        </div>
        {operationsByType.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {isChinese ? "暂无操作记录" : "No operations recorded"}
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {operationsByType.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border bg-muted/30 p-4 text-center"
              >
                <p className="text-xs uppercase text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold">{item.count}</p>
              </div>
            ))}
          </div>
        )}
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

