"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DashboardOverview } from "@/lib/repositories/analytics";
import {
  type AssetStatus,
  getAssetStatusLabel,
} from "@/lib/types/asset";
import { getOperationTypeLabel } from "@/lib/types/operation";
import RangeFilter from "@/components/dashboard/RangeFilter";
import ApprovalStatusBadge from "@/components/approvals/ApprovalStatusBadge";
import type { ApprovalStatus } from "@/lib/types/approval";
import { getApiClient } from "@/lib/http/client";
import AdminOnly from "@/components/auth/AdminOnly";
import type { AssetCategory } from "@/lib/types/asset-category";
import type { InventoryTask } from "@/lib/types/inventory";

const RANGE_OPTIONS = [7, 14, 30] as const;

function ensureSingle(value?: string | string[] | null) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

const EMPTY_SUMMARY = {
  assets: 0,
  companies: 0,
  roles: 0,
  consumables: 0,
  lowStockConsumables: 0,
};

const EMPTY_OVERVIEW: DashboardOverview = {
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

export default function LocaleDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const isChinese = locale === "zh";
  const searchParams = useSearchParams();
  const rangeParam = ensureSingle(searchParams.get("range") ?? searchParams.get("days"));
  const parsedRange = Number(rangeParam);
  const range = RANGE_OPTIONS.includes(parsedRange as (typeof RANGE_OPTIONS)[number])
    ? parsedRange
    : 14;

  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [overview, setOverview] = useState<DashboardOverview>(EMPTY_OVERVIEW);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [inventoryTasks, setInventoryTasks] = useState<InventoryTask[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const client = await getApiClient();
        const [summaryResp, overviewResp, categoriesResp, inventoryResp] = await Promise.all([
          client.get<{
            data: {
              assets: number;
              companies: number;
              roles: number;
              consumables?: number;
              lowStockConsumables?: number;
            };
          }>("/apps/asset-hub/api/system/config", { headers: { "Cache-Control": "no-cache" } }),
          client.get<{ data: DashboardOverview }>("/apps/asset-hub/api/reports/overview", {
            params: { days: range },
            headers: { "Cache-Control": "no-cache" },
          }),
          client.get<{ data: AssetCategory[] }>("/apps/asset-hub/api/assets/categories"),
          client.get<{ data: InventoryTask[] }>("/apps/asset-hub/api/assets/inventory-tasks"),
        ]);
        if (cancelled) return;
        setSummary({
          assets: summaryResp.data.data.assets,
          companies: summaryResp.data.data.companies,
          roles: summaryResp.data.data.roles,
          consumables: summaryResp.data.data.consumables ?? 0,
          lowStockConsumables: summaryResp.data.data.lowStockConsumables ?? 0,
        });
        setOverview(overviewResp.data.data ?? EMPTY_OVERVIEW);
        setCategories(categoriesResp.data.data ?? []);
        setInventoryTasks(inventoryResp.data.data ?? []);
      } catch {
        if (!cancelled) {
          setSummary(EMPTY_SUMMARY);
          setOverview(EMPTY_OVERVIEW);
          setCategories([]);
          setInventoryTasks([]);
        }
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const categoryMap = useMemo(
    () =>
      new Map(
        categories.map((category) => [
          category.code,
          locale === "zh" ? category.labelZh : category.labelEn,
        ]),
      ),
    [categories, locale],
  );
  const recentOperations = overview.operationsTrend.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const inventoryCount = inventoryTasks.length;

  const withLocale = (path: string) => `/${locale}${path}`;

  const highlightStats = [
    {
      key: "assets-total",
      label: isChinese ? "资产总数" : "Total Assets",
      value: overview.stats.total,
      href: "/assets/list",
    },
    {
      key: "assets-in-use",
      label: isChinese ? "使用中资产" : "Assets In Use",
      value: overview.stats.inUse,
      href: "/assets/list?status=in-use",
    },
    {
      key: "pending-approvals",
      label: isChinese ? "待审批" : "Pending Approvals",
      value: overview.stats.pendingApprovals,
      href: "/approvals?role=my-tasks",
    },
    {
      key: "low-stock-consumables",
      label: isChinese ? "低库存耗材" : "Low-stock Consumables",
      value: summary.lowStockConsumables ?? 0,
      href: "/consumables/alerts",
    },
  ];

  const supportingStats = [
    {
      key: "assets-idle",
      label: isChinese ? "闲置资产" : "Idle Assets",
      value: overview.stats.idle,
      adminOnly: false,
    },
    {
      key: "operations-range",
      label: isChinese ? `${range} 天操作` : `Ops (${range}d)`,
      value: recentOperations,
      href: "/system/operation",
      adminOnly: true,
    },
    {
      key: "companies",
      label: isChinese ? "公司数量" : "Companies",
      value: summary.companies,
      href: "/system/company",
      adminOnly: true,
    },
    {
      key: "roles",
      label: isChinese ? "角色数量" : "Roles",
      value: summary.roles,
      href: "/system/role",
      adminOnly: true,
    },
    {
      key: "consumables",
      label: isChinese ? "耗材记录" : "Consumables",
      value: summary.consumables ?? 0,
      href: "/consumables/list",
      adminOnly: false,
    },
    {
      key: "inventory-tasks",
      label: isChinese ? "盘点任务" : "Inventory Tasks",
      value: inventoryCount,
      href: "/assets/inventory",
      adminOnly: true,
    },
  ];

  const shortcuts = [
    {
      label: isChinese ? "资产列表" : "Asset List",
      href: "/assets/list",
      adminOnly: false,
    },
    {
      label: isChinese ? "新增资产" : "New Asset",
      href: "/assets/new",
      adminOnly: true,
    },
    {
      label: isChinese ? "系统管理" : "System",
      href: "/system",
      adminOnly: true,
    },
    {
      label: isChinese ? "审批中心" : "Approvals",
      href: "/approvals",
      adminOnly: false,
    },
    {
      label: isChinese ? "资产盘点" : "Inventory",
      href: "/assets/inventory",
      adminOnly: true,
    },
    {
      label: isChinese ? "耗材管理" : "Consumables",
      href: "/consumables",
      adminOnly: false,
    },
    {
      label: isChinese ? "版本信息" : "Version Info",
      href: "/system/upgrade",
      adminOnly: true,
    },
    {
      label: isChinese ? "帮助中心" : "Help Center",
      href: "/help",
      adminOnly: false,
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
                ? "优先关注资产核心指标与审批待办。"
                : "Focus on the most important KPIs and approvals first."}
            </p>
          </div>
          <RangeFilter locale={locale} value={range} />
        </div>
        <div
          className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="dashboard-stats"
        >
          {highlightStats.map((card) => {
            const content = (
              <>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-3xl font-semibold">{card.value}</p>
              </>
            );
            return (
              <Link
                key={card.key}
                href={withLocale(card.href)}
                className="rounded-3xl border border-primary/10 bg-muted/40 px-4 py-6 text-center transition hover:border-primary/40"
              >
                {content}
              </Link>
            );
          })}
        </div>
        <div className="mt-8 rounded-3xl border bg-muted/10 p-4">
          <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {isChinese ? "系统概览" : "System Snapshot"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isChinese
                  ? "辅助指标帮助你快速判断后续需要处理的模块。"
                  : "Secondary indicators hint at the next module to visit."}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {supportingStats.map((card) => {
              const content = (
                <>
                  <p className="text-xs uppercase text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="text-xl font-semibold">{card.value}</p>
                </>
              );
              let wrappedContent;
              if (card.href) {
                wrappedContent = (
                  <Link
                    key={card.key}
                    href={withLocale(card.href)}
                    className="rounded-2xl border bg-background/70 px-4 py-3 text-left text-sm transition hover:border-primary/40"
                  >
                    {content}
                  </Link>
                );
              } else {
                wrappedContent = (
                  <div
                    key={card.key}
                    className="rounded-2xl border bg-background/50 px-4 py-3 text-left text-sm"
                  >
                    {content}
                  </div>
                );
              }

              if (card.adminOnly) {
                return <AdminOnly key={card.key}>{wrappedContent}</AdminOnly>;
              }
              return wrappedContent;
            })}
          </div>
        </div>
      </section>

      <section
        className="rounded-3xl border bg-card p-6 shadow-sm"
        data-testid="dashboard-shortcuts"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {isChinese ? "快捷入口" : "Shortcuts"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isChinese ? "一步直达高频功能。" : "Jump straight into frequent flows."}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {shortcuts.map((item) => {
            const link = (
              <Link
                key={item.href}
                href={withLocale(item.href)}
                className="rounded-full border px-4 py-2 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {item.label}
              </Link>
            );

            if (item.adminOnly) {
              return <AdminOnly key={item.href}>{link}</AdminOnly>;
            }
            return link;
          })}
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
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">
            {isChinese ? "运营洞察" : "Operational Insights"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isChinese
              ? `结合审批与操作趋势，了解近 ${range} 天的资产流转。`
              : `Review approvals and operations from the last ${range} days.`}
          </p>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border bg-muted/15 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">
                  {isChinese ? "审批中心" : "Approvals"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isChinese ? "状态与趋势" : "Status & trend"}
                </p>
              </div>
              <Link
                href={withLocale("/approvals")}
                className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {isChinese ? "查看" : "Open"}
              </Link>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                {isChinese ? "状态概览" : "Status Overview"}
              </p>
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
                        className="flex items-center justify-between rounded-2xl border bg-card/70 px-3 py-2 text-sm"
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
              <p className="text-xs uppercase text-muted-foreground">
                {isChinese ? "趋势" : "Trend"}
              </p>
              <div className="mt-3">
                {renderTrend(
                  overview.approvalsTrend,
                  isChinese ? "暂无审批记录" : "No approvals yet",
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-muted/15 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">
                  {isChinese ? "操作动态" : "Operations"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isChinese ? "类型与趋势" : "Types & trend"}
                </p>
              </div>
              <Link
                href={withLocale("/assets/list")}
                className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {isChinese ? "资产列表" : "Assets"}
              </Link>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                {isChinese ? "按类型" : "By Type"}
              </p>
              {operationsByType.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {isChinese ? "暂无操作记录" : "No operations recorded"}
                </p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {operationsByType.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border bg-card/70 p-3 text-center"
                    >
                      <p className="text-xs uppercase text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold">{item.count}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                {isChinese ? "趋势" : "Trend"}
              </p>
              <div className="mt-3">
                {renderTrend(
                  overview.operationsTrend,
                  isChinese ? "暂无操作记录" : "No operations yet",
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
