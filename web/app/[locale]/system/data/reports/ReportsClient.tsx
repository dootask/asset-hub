"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import AssetCategoryTable, {
  type AssetCategoryTableHandle,
} from "@/components/assets/AssetCategoryTable";
import type { AssetCategory } from "@/lib/types/asset-category";

interface Props {
  locale: string;
  categories: AssetCategory[];
  summary: {
    assetsByStatus: { label: string; count: number }[];
    assetsByCategory: { label: string; count: number }[];
    approvalsByStatus: { label: string; count: number }[];
    operationsByType: { label: string; count: number }[];
  };
}

export default function ReportsClient({ locale, categories, summary }: Props) {
  const isChinese = locale === "zh";
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}`
      : "";

  const categoryTableRef = useRef<AssetCategoryTableHandle>(null);
  const tiles = useMemo(
    () => [
      {
        titleZh: "资产状态",
        titleEn: "Assets by Status",
        data: summary.assetsByStatus,
        link: `/${locale}/assets/list`,
      },
      {
        titleZh: "资产类别",
        titleEn: "Assets by Category",
        data: summary.assetsByCategory.slice(0, 8),
        link: `/${locale}/assets/categories`,
      },
      {
        titleZh: "审批状态",
        titleEn: "Approvals by Status",
        data: summary.approvalsByStatus,
        link: `/${locale}/approvals`,
      },
      {
        titleZh: "操作类型（30 天）",
        titleEn: "Operations (30d)",
        data: summary.operationsByType,
        link: `/${locale}/assets/list`,
      },
    ],
    [summary, locale],
  );

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-2">
        {tiles.map((tile) => (
          <div key={tile.titleEn} className="rounded-3xl border bg-card/80 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {isChinese ? tile.titleZh : tile.titleEn}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isChinese ? "按最新数据统计" : "Latest counts"}
                </p>
              </div>
              <Link
                href={tile.link}
                className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {isChinese ? "查看详情" : "View details"}
              </Link>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {tile.data.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-muted-foreground/40 p-4 text-center text-xs text-muted-foreground">
                  {isChinese ? "暂无数据" : "No data yet"}
                </li>
              ) : (
                tile.data.map((entry) => (
                  <li
                    key={`${tile.titleEn}-${entry.label}`}
                    className="flex items-center justify-between rounded-2xl border bg-muted/30 px-4 py-2"
                  >
                    <span className="font-medium">{entry.label || "-"}</span>
                    <span className="text-muted-foreground">{entry.count}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {isChinese ? "导出报表" : "Export Reports"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isChinese
                ? "下载最新的资产与审批 CSV，后续将支持自定义模板。"
                : "Download the latest asset and approval CSV exports. Custom templates coming soon."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/apps/asset-hub/api/assets/export"
              className="inline-flex items-center rounded-2xl border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {isChinese ? "资产 CSV" : "Assets CSV"}
            </Link>
            <Link
              href="/apps/asset-hub/api/approvals/export"
              className="inline-flex items-center rounded-2xl border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {isChinese ? "审批 CSV" : "Approvals CSV"}
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card/80 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {isChinese ? "类别配置" : "Category Configuration"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isChinese
                ? "管理资产类别并用于报表统计。"
                : "Manage asset categories used throughout the reports."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => categoryTableRef.current?.openCreateDialog()}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            {isChinese ? "新增类别" : "New Category"}
          </button>
        </div>
        <div className="mt-4">
          <AssetCategoryTable
            ref={categoryTableRef}
            initialCategories={categories}
            locale={locale}
            baseUrl={baseUrl}
          />
        </div>
      </section>
    </>
  );
}


