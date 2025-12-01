"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AssetCategoryTable, {
  type AssetCategoryTableHandle,
} from "@/components/assets/AssetCategoryTable";
import type { AssetCategory } from "@/lib/types/asset-category";
import { APPROVAL_TYPES } from "@/lib/types/approval";
import { getApiClient } from "@/lib/http/client";
import { downloadWithDooTask } from "@/lib/utils/download";

interface Props {
  locale: string;
  categories: AssetCategory[];
  summary?: {
    assetsByStatus: { label: string; count: number }[];
    assetsByCategory: { label: string; count: number }[];
    approvalsByStatus: { label: string; count: number }[];
    approvalsByType: { label: string; count: number }[];
    approvalsRecent30d: { label: string; count: number }[];
    operationsByType: { label: string; count: number }[];
  };
}

const EMPTY_SUMMARY = {
  assetsByStatus: [] as Array<{ label: string; count: number }>,
  assetsByCategory: [] as Array<{ label: string; count: number }>,
  approvalsByStatus: [] as Array<{ label: string; count: number }>,
  approvalsByType: [] as Array<{ label: string; count: number }>,
  approvalsRecent30d: [] as Array<{ label: string; count: number }>,
  operationsByType: [] as Array<{ label: string; count: number }>,
};

const APPROVAL_STATUS_LABELS: Record<
  string,
  { zh: string; en: string }
> = {
  pending: { zh: "待审批", en: "Pending" },
  approved: { zh: "已通过", en: "Approved" },
  rejected: { zh: "已驳回", en: "Rejected" },
  cancelled: { zh: "已撤销", en: "Cancelled" },
};

export default function ReportsClient({ locale, categories, summary }: Props) {
  const isChinese = locale === "zh";
  const [data, setData] = useState(summary ?? EMPTY_SUMMARY);

  const categoryTableRef = useRef<AssetCategoryTableHandle>(null);
  const approvalTypeLabelMap = useMemo(() => {
    const map: Record<string, { zh: string; en: string }> = {};
    APPROVAL_TYPES.forEach((type) => {
      map[type.value] = { zh: type.labelZh, en: type.labelEn };
    });
    return map;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSummary() {
      try {
        const client = await getApiClient();
        const response = await client.get<{ data: Props["summary"] }>(
          "/apps/asset-hub/api/reports/summary",
          { headers: { "Cache-Control": "no-cache" } },
        );
        if (!cancelled && response.data?.data) {
          setData(response.data.data);
        }
      } catch {
        if (!cancelled) {
          setData(EMPTY_SUMMARY);
        }
      }
    }
    loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownloadAssets = () =>
    downloadWithDooTask("/apps/asset-hub/api/assets/export");
  const handleDownloadApprovals = () =>
    downloadWithDooTask("/apps/asset-hub/api/approvals/export");

  const tiles = useMemo(
    () => [
      {
        titleZh: "资产状态",
        titleEn: "Assets by Status",
        data: data.assetsByStatus,
        link: `/${locale}/assets/list`,
      },
      {
        titleZh: "资产类别",
        titleEn: "Assets by Category",
        data: data.assetsByCategory.slice(0, 8),
        link: `/${locale}/assets/categories`,
      },
      {
        titleZh: "审批状态",
        titleEn: "Approvals by Status",
        data: data.approvalsByStatus,
        link: `/${locale}/approvals`,
      },
      {
        titleZh: "审批类型",
        titleEn: "Approvals by Type",
        data: data.approvalsByType.map((entry) => ({
          label:
            approvalTypeLabelMap[entry.label]?.[
              locale === "zh" ? "zh" : "en"
            ] ?? entry.label,
          count: entry.count,
        })),
        link: `/${locale}/approvals`,
      },
      {
        titleZh: "操作类型（30 天）",
        titleEn: "Operations (30d)",
        data: data.operationsByType,
        link: `/${locale}/assets/list`,
      },
      {
        titleZh: "审批结果（30 天）",
        titleEn: "Approval outcomes (30d)",
        data: data.approvalsRecent30d.map((entry) => ({
          label:
            APPROVAL_STATUS_LABELS[entry.label]?.[
              locale === "zh" ? "zh" : "en"
            ] ?? entry.label,
          count: entry.count,
        })),
        link: `/${locale}/approvals`,
      },
    ],
    [data, locale, approvalTypeLabelMap],
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
            <button
              type="button"
              onClick={handleDownloadAssets}
              className="inline-flex items-center rounded-2xl border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {isChinese ? "资产 CSV" : "Assets CSV"}
            </button>
            <button
              type="button"
              onClick={handleDownloadApprovals}
              className="inline-flex items-center rounded-2xl border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {isChinese ? "审批 CSV" : "Approvals CSV"}
            </button>
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
          />
        </div>
      </section>
    </>
  );
}
