"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ConsumableFilters from "@/components/consumables/ConsumableFilters";
import ListPagination from "@/components/layout/ListPagination";
import PageHeader from "@/components/layout/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Consumable, getConsumableStatusLabel } from "@/lib/types/consumable";
import type { ConsumableCategory } from "@/lib/types/consumable";
import type { Company } from "@/lib/types/system";
import { getApiClient } from "@/lib/http/client";
import AdminOnly from "@/components/auth/AdminOnly";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import ConsumableDeleteRestoreActions from "@/components/consumables/ConsumableDeleteRestoreActions";
import { stripDeletedSuffix } from "@/lib/utils/asset-number";

type SearchParams = Record<string, string | string[] | undefined>;

function buildSearchParams(searchParams: URLSearchParams): SearchParams {
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of searchParams.entries()) {
    if (result[key]) {
      const existing = result[key];
      result[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      result[key] = value;
    }
  }
  return result;
}

export default function ConsumableRecycleBinPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const isChinese = locale === "zh";
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<ConsumableCategory[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 10 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const resolvedSearchParams = useMemo(
    () => buildSearchParams(searchParams ?? new URLSearchParams()),
    [searchParams],
  );

  const companyMap = useMemo(
    () => new Map(companies.map((company) => [company.code, company.name])),
    [companies],
  );

  const categoryMap = useMemo(
    () =>
      new Map(
        categories.map((category) => [
          category.code,
          isChinese ? category.labelZh : category.labelEn,
        ]),
      ),
    [categories, isChinese],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadDictionaries() {
      try {
        const client = await getApiClient();
        const [categoryResp, companyResp] = await Promise.all([
          client.get<{ data: ConsumableCategory[] }>("/apps/asset-hub/api/consumables/categories"),
          client.get<{ data: Company[] }>("/apps/asset-hub/api/system/companies"),
        ]);
        if (!cancelled) {
          setCategories(categoryResp.data.data);
          setCompanies(companyResp.data.data);
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
          setCompanies([]);
        }
      }
    }
    loadDictionaries();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadConsumables() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const qs = new URLSearchParams();
        const allowList = ["search", "status", "category", "company", "page", "pageSize"];
        allowList.forEach((key) => {
          const value = resolvedSearchParams[key];
          if (Array.isArray(value)) {
            value.forEach((entry) => entry && qs.append(key, entry));
          } else if (typeof value === "string" && value) {
            qs.set(key, value);
          }
        });

        const client = await getApiClient();
        const response = await client.get<{
          data: Consumable[];
          meta: { total: number; page: number; pageSize: number };
        }>("/apps/asset-hub/api/consumables/deleted", {
          params: Object.fromEntries(qs.entries()),
          headers: { "Cache-Control": "no-cache" },
        });

        if (!cancelled) {
          setConsumables(response.data.data);
          setMeta(response.data.meta);
        }
      } catch (err) {
        if (!cancelled) {
          const message = extractApiErrorMessage(
            err,
            isChinese ? "已删除耗材加载失败" : "Failed to load deleted consumables.",
          );
          setErrorMessage(message);
          setConsumables([]);
          setMeta({ total: 0, page: 1, pageSize: 10 });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadConsumables();
    return () => {
      cancelled = true;
    };
  }, [resolvedSearchParams, isChinese, refreshKey]);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    Object.entries(resolvedSearchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => entry && params.append(key, entry));
      } else if (typeof value === "string" && value) {
        params.set(key, value);
      }
    });
    return params;
  };

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  const buildPageLink = (page: number) => {
    const params = buildQueryParams();
    params.set("page", page.toString());
    return `?${params.toString()}`;
  };

  const withLocale = (path: string) => `/${locale}${path}`;

  return (
    <AdminOnly
      fallback={
        <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          {isChinese ? "仅系统管理员可访问回收站。" : "Admins only."}
        </div>
      }
    >
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
              href: `/${locale}/consumables/list`,
              labelZh: "耗材列表",
              labelEn: "Consumable List",
            },
            {
              labelZh: "回收站",
              labelEn: "Recycle Bin",
            },
          ]}
          title={isChinese ? "耗材回收站" : "Consumable Recycle Bin"}
          description={
            isChinese
              ? "仅展示已删除耗材，可在此恢复。"
              : "Review deleted consumables and restore them here."
          }
          actions={
            <Link
              href={withLocale("/consumables/list")}
              className="inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {isChinese ? "返回列表" : "Back to list"}
            </Link>
          }
        />

        <ConsumableFilters locale={locale} categories={categories} companies={companies} />

        {errorMessage ? (
          <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-destructive">
            {errorMessage}
          </div>
        ) : loading ? (
          <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
            {isChinese ? "加载中..." : "Loading..."}
          </div>
        ) : consumables.length === 0 ? (
          <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
            {isChinese
              ? "回收站暂无耗材。"
              : "No deleted consumables in the recycle bin."}
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border bg-card">
            <Table className="text-sm">
              <TableHeader className="bg-muted/50">
                <TableRow className="text-left text-xs uppercase tracking-wide text-muted-foreground hover:bg-transparent">
                  <TableHead className="px-4 py-3 w-[220px]">
                    {isChinese ? "耗材名称" : "Consumable"}
                  </TableHead>
                  <TableHead className="px-4 py-3">{isChinese ? "类别" : "Category"}</TableHead>
                  <TableHead className="px-4 py-3">{isChinese ? "库存" : "Quantity"}</TableHead>
                  <TableHead className="px-4 py-3">{isChinese ? "所属公司" : "Company"}</TableHead>
                  <TableHead className="px-4 py-3">{isChinese ? "状态" : "Status"}</TableHead>
                  <TableHead className="px-4 py-3">{isChinese ? "删除时间" : "Deleted At"}</TableHead>
                  <TableHead className="px-4 py-3">{isChinese ? "删除原因" : "Reason"}</TableHead>
                  <TableHead className="px-4 py-3 text-right">
                    {isChinese ? "操作" : "Actions"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumables.map((consumable) => (
                  <TableRow key={consumable.id}>
                    <TableCell className="px-4 py-3 whitespace-normal w-[220px]">
                      <Link
                        href={withLocale(`/consumables/${consumable.id}`)}
                        className="font-medium text-primary hover:underline line-clamp-2 wrap-break-word"
                        title={consumable.name}
                      >
                        {consumable.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {stripDeletedSuffix(consumable.consumableNo) || consumable.id}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {categoryMap.get(consumable.category) ?? consumable.category}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {consumable.quantity} {consumable.unit}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {consumable.companyCode
                        ? companyMap.get(consumable.companyCode) ?? consumable.companyCode
                        : isChinese
                          ? "未指定"
                          : "Unassigned"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                        {getConsumableStatusLabel(consumable.status, locale)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {consumable.deletedAt
                        ? new Date(consumable.deletedAt).toLocaleString(
                            locale === "zh" ? "zh-CN" : "en-US",
                          )
                        : "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="line-clamp-2 text-sm text-muted-foreground">
                        {consumable.deleteReason || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <ConsumableDeleteRestoreActions
                        consumableId={consumable.id}
                        locale={locale}
                        isDeleted
                        redirectOnDelete={false}
                        onActionComplete={() => setRefreshKey((key) => key + 1)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        )}

        {consumables.length > 0 && !errorMessage && (
          <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p className="shrink-0">
              {isChinese ? `共 ${meta.total} 条记录` : `${meta.total} records total`}
            </p>
            <ListPagination
              currentPage={meta.page}
              totalPages={totalPages}
              getHref={buildPageLink}
            />
          </div>
        )}
      </div>
    </AdminOnly>
  );
}
