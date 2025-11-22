import Link from "next/link";
import type { DashboardOverview } from "@/lib/repositories/analytics";
import { getRequestBaseUrl } from "@/lib/utils/server-url";
import {
  type AssetStatus,
  getAssetStatusLabel,
} from "@/lib/types/asset";
import { getOperationTypeLabel } from "@/lib/types/operation";
import RangeFilter from "@/components/dashboard/RangeFilter";
import ApprovalStatusBadge from "@/components/approvals/ApprovalStatusBadge";
import type { ApprovalStatus } from "@/lib/types/approval";
import { listAssetCategories } from "@/lib/repositories/asset-categories";
import { listInventoryTasks } from "@/lib/repositories/inventory-tasks";

const RANGE_OPTIONS = [7, 14, 30] as const;

function ensureSingle(value?: string | string[] | null) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

async function fetchSummary() {
  const baseUrl = await getRequestBaseUrl();
  const response = await fetch(`${baseUrl}/apps/asset-hub/api/system/config`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return {
      assets: 0,
      companies: 0,
      roles: 0,
      consumables: 0,
      lowStockConsumables: 0,
    };
  }
  const payload = (await response.json()) as {
    data: {
      assets: number;
      companies: number;
      roles: number;
      consumables?: number;
      lowStockConsumables?: number;
    };
  };
  return {
    assets: payload.data.assets,
    companies: payload.data.companies,
    roles: payload.data.roles,
    consumables: payload.data.consumables ?? 0,
    lowStockConsumables: payload.data.lowStockConsumables ?? 0,
  };
}

async function fetchOverview(days: number) {
  const baseUrl = await getRequestBaseUrl();
  const response = await fetch(
    `${baseUrl}/apps/asset-hub/api/reports/overview?days=${days}`,
    {
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const fallback: DashboardOverview = {
      stats: {
        total: 0,
        inUse: 0,
        idle: 0,
        maintenance: 0,
        retired: 0,
        pendingApprovals: 0,
      },
      assetsByStatus: [],
      assetsByCategory: [],
      approvalsByStatus: [],
      approvalsTrend: [],
      operationsByType: [],
      operationsTrend: [],
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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [resolvedParams, resolvedSearchParams = {}] = await Promise.all([
    params,
    searchParams,
  ]);
  const { locale } = resolvedParams;
  const isChinese = locale === "zh";
  const rangeParam = ensureSingle(resolvedSearchParams.range ?? resolvedSearchParams.days);
  const parsedRange = Number(rangeParam);
  const range = RANGE_OPTIONS.includes(parsedRange as (typeof RANGE_OPTIONS)[number])
    ? parsedRange
    : 14;

  const [summary, overview, categories, inventoryTasks] = await Promise.all([
    fetchSummary(),
    fetchOverview(range),
    listAssetCategories(),
    listInventoryTasks(),
  ]);
  const categoryMap = new Map(
    categories.map((category) => [
      category.code,
      locale === "zh" ? category.labelZh : category.labelEn,
    ]),
  );
  const recentOperations = overview.operationsTrend.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const inventoryCount = inventoryTasks.length;

  const withLocale = (path: string) => `/${locale}${path}`;

  const statsCards = [
    {
      key: "assets-total",
      label: isChinese ? "资产总数" : "Total Assets",
      value: overview.stats.total,
      href: "/assets/list",
    },
    {
      key: "assets-in-use",
      label: isChinese ? "使用中" : "In Use",
      value: overview.stats.inUse,
    },
    {
      key: "assets-idle",
      label: isChinese ? "闲置" : "Idle",
      value: overview.stats.idle,
    },
    {
      key: "pending-approvals",
      label: isChinese ? "待审批" : "Pending Approvals",
      value: overview.stats.pendingApprovals,
      href: "/approvals?role=my-tasks",
    },
    {
      key: "operations-range",
      label: isChinese
        ? `${range} 天操作`
        : `Ops (${range}d)`,
      value: recentOperations,
      href: "/system/operation",
    },
  ];

  const secondaryStats = [
    {
      key: "companies",
      label: isChinese ? "公司数量" : "Companies",
      value: summary.companies,
      href: "/system/company",
    },
    {
      key: "roles",
      label: isChinese ? "角色数量" : "Roles",
      value: summary.roles,
      href: "/system/role",
    },
    {
      key: "consumables",
      label: isChinese ? "耗材记录" : "Consumables",
      value: summary.consumables ?? 0,
      href: "/consumables/list",
    },
    {
      key: "consumables-low-stock",
      label: isChinese ? "低库存耗材" : "Low-stock",
      value: summary.lowStockConsumables ?? 0,
      href: "/consumables/alerts",
    },
    {
      key: "inventory-tasks",
      label: isChinese ? "盘点任务" : "Inventory Tasks",
      value: inventoryCount,
      href: "/assets/inventory",
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
    {
      label: isChinese ? "资产盘点" : "Inventory",
      href: "/assets/inventory",
    },
    {
      label: isChinese ? "耗材管理" : "Consumables",
      href: "/consumables",
    },
    {
      label: isChinese ? "版本信息" : "Version Info",
      href: "/system/upgrade",
    },
  ];

  const assetStatusDistribution = overview.assetsByStatus.map((item) => ({
    ...item,
    label: getAssetStatusLabel(item.label as AssetStatus, locale),
  }));

  const assetCategoryDistribution = overview.assetsByCategory.map((item) => ({
    ...item,
    label: categoryMap.get(item.label) ?? item.label,
  }));

  const operationsByType = overview.operationsByType.map((item) => ({
    ...item,
    label: getOperationTypeLabel(item.label, locale),
  }));

  const renderDistribution = (
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

  const renderTrend = (items: Array<{ date: string; count: number }>, emptyLabel: string) => {
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
    }
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
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
      <section
        className="rounded-3xl border bg-card p-6 shadow-sm"
        data-testid="dashboard-hero"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
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
          </div>
          <RangeFilter locale={locale} value={range} />
        </div>
        <div
          className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="dashboard-stats"
        >
          {statsCards.map((card) => {
            const content = (
              <>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-semibold">{card.value}</p>
              </>
            );
            if (card.href) {
              return (
                <Link
                  key={card.key}
                  href={withLocale(card.href)}
                  className="rounded-2xl border bg-muted/30 px-4 py-5 text-center transition hover:border-primary/30"
                >
                  {content}
                </Link>
              );
            }
            return (
              <div
                key={card.key}
                className="rounded-2xl border bg-muted/30 px-4 py-5 text-center"
              >
                {content}
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {secondaryStats.map((card) => (
            <Link
              key={card.key}
              href={withLocale(card.href)}
              className="rounded-2xl border bg-muted/20 px-4 py-4 text-center transition hover:border-primary/30"
            >
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-xl font-semibold">{card.value}</p>
            </Link>
          ))}
        </div>
      </section>

      <section
        className="rounded-3xl border bg-card p-6 shadow-sm"
        data-testid="dashboard-distribution"
      >
        <h2 className="text-lg font-semibold">
          {isChinese ? "资产分布" : "Asset Distribution"}
        </h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              {isChinese ? "按状态" : "By Status"}
            </h3>
            <div className="mt-3">
              {renderDistribution(assetStatusDistribution)}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              {isChinese ? "按类别（前 5）" : "Top Categories"}
            </h3>
            <div className="mt-3">
              {renderDistribution(assetCategoryDistribution)}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {isChinese ? "审批洞察" : "Approval Insights"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isChinese
                ? `近 ${range} 天的审批状态与趋势。`
                : `Status and trend in the last ${range} days.`}
            </p>
          </div>
          <Link
            href={withLocale("/approvals")}
            className="rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {isChinese ? "查看全部审批" : "View approvals"}
          </Link>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              {isChinese ? "状态概览" : "Status Overview"}
            </h3>
            {overview.approvalsByStatus.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {isChinese ? "暂无审批记录" : "No approvals yet"}
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {overview.approvalsByStatus.map((item) => {
                  const status = item.label as ApprovalStatus;
                  return (
                    <li
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl border bg-muted/20 px-3 py-2 text-sm"
                    >
                      <ApprovalStatusBadge status={status} locale={locale} />
                      <span className="text-muted-foreground">{item.count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              {isChinese ? "趋势" : "Trend"}
            </h3>
            <div className="mt-3">
              {renderTrend(
                overview.approvalsTrend,
                isChinese ? "暂无审批记录" : "No approvals yet",
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {isChinese ? "操作统计" : "Ops Summary"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isChinese
                ? `近 ${range} 天各操作类型的数量。`
                : `Operations by type in the last ${range} days.`}
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
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            {isChinese ? "操作趋势" : "Operation Trend"}
          </h3>
          <div className="mt-3">
            {renderTrend(
              overview.operationsTrend,
              isChinese ? "暂无操作记录" : "No operations yet",
            )}
          </div>
        </div>
      </section>

      <section
        className="rounded-3xl border bg-card p-6 shadow-sm"
        data-testid="dashboard-shortcuts"
      >
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

