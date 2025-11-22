import Link from "next/link";
import type { Metadata } from "next";
import ConsumableFilters from "@/components/consumables/ConsumableFilters";
import ConsumableTable from "@/components/consumables/ConsumableTable";
import PageHeader from "@/components/layout/PageHeader";
import { listConsumableCategories } from "@/lib/repositories/consumable-categories";
import {
  getConsumableStockStats,
  listConsumables,
  type ConsumableListResult,
} from "@/lib/repositories/consumables";
import { CONSUMABLE_STATUSES } from "@/lib/types/consumable";

type PageParams = {
  locale: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

interface PageProps {
  params: Promise<PageParams>;
  searchParams?: Promise<SearchParams>;
}

export const metadata: Metadata = {
  title: "耗材列表 - Asset Hub",
};

function ensureSingle(value?: string | string[] | null) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value?: string | null) {
  if (!value) return undefined;
  const normalized = value.split(",").map((entry) => entry.trim());
  const filtered = normalized.filter((entry) =>
    CONSUMABLE_STATUSES.includes(entry as (typeof CONSUMABLE_STATUSES)[number]),
  );
  return filtered.length ? filtered : undefined;
}

export default async function ConsumableListPage({
  params,
  searchParams,
}: PageProps) {
  const [resolvedParams, resolvedSearchParams = {}] = await Promise.all([
    params,
    searchParams,
  ]);
  const { locale } = resolvedParams;
  const isChinese = locale === "zh";

  const categories = listConsumableCategories();
  const stockStats = getConsumableStockStats();
  const pageParam = Number(ensureSingle(resolvedSearchParams.page));
  const page = Number.isNaN(pageParam) ? 1 : Math.max(pageParam, 1);
  const query = {
    search: ensureSingle(resolvedSearchParams.search),
    category: ensureSingle(resolvedSearchParams.category),
    status: parseStatus(ensureSingle(resolvedSearchParams.status)),
    page,
    pageSize: 10,
  };
  const result: ConsumableListResult = listConsumables(query);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  const buildPageLink = (target: number) => {
    const params = new URLSearchParams();
    Object.entries(resolvedSearchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => entry && params.append(key, entry));
      } else if (typeof value === "string" && value) {
        params.set(key, value);
      }
    });
    params.set("page", String(target));
    return `?${params.toString()}`;
  };

  const withLocale = (path: string) => `/${locale}${path}`;
  const lowStockTotal = stockStats.lowStock + stockStats.outOfStock;
  const lowStockFilterHref = withLocale("/consumables/alerts");

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          {
            href: `/${locale}/consumables`,
            labelZh: "耗材管理",
            labelEn: "Consumables",
          },
          {
            labelZh: "耗材列表",
            labelEn: "Consumable List",
          },
        ]}
        title={isChinese ? "耗材列表" : "Consumable List"}
        description={
          isChinese
            ? "查看耗材库存、状态与安全库存情况。"
            : "Monitor consumable stock levels and status."
        }
        actions={
          <>
            <Link
              href={withLocale("/consumables/import-export")}
              className="inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {isChinese ? "导入 / 导出" : "Import / Export"}
            </Link>
            <Link
              href={withLocale("/consumables/settings")}
              className="inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {isChinese ? "类别管理" : "Categories"}
            </Link>
          </>
        }
      />

      <ConsumableFilters locale={locale} categories={categories} />

      {lowStockTotal > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-semibold">
                {isChinese ? "低库存预警" : "Low Stock Alert"}
              </p>
              <p>
                {isChinese
                  ? `有 ${lowStockTotal} 个耗材低于安全库存或缺货，请及时补货。`
                  : `${lowStockTotal} consumables are below safety stock or out of stock.`}
              </p>
            </div>
            <Link
              href={lowStockFilterHref}
              className="inline-flex items-center justify-center rounded-full border border-amber-300 px-4 py-2 text-xs font-medium text-amber-900 transition hover:bg-amber-100 dark:border-amber-500/40 dark:text-amber-100 dark:hover:bg-amber-500/20"
            >
              {isChinese ? "查看明细" : "View items"}
            </Link>
          </div>
        </div>
      )}

      <ConsumableTable locale={locale} consumables={result.items} />

      <div className="flex flex-col gap-3 rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>
          {isChinese
            ? `共 ${result.total} 条记录`
            : `${result.total} records total`}
        </p>
        <nav className="flex items-center gap-2 text-xs">
          {Array.from({ length: totalPages }).map((_, index) => {
            const pageNumber = index + 1;
            const active = pageNumber === result.page;
            return (
              <Link
                key={pageNumber}
                href={buildPageLink(pageNumber)}
                className={`rounded-full px-3 py-1 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pageNumber}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
