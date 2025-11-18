import Link from "next/link";
import AssetFilters from "@/components/assets/AssetFilters";
import type { Asset } from "@/lib/types/asset";
import { getRequestBaseUrl } from "@/lib/utils/server-url";

const statusText: Record<
  Asset["status"],
  { zh: string; en: string }
> = {
  "in-use": { zh: "使用中", en: "In Use" },
  idle: { zh: "闲置", en: "Idle" },
  maintenance: { zh: "维护中", en: "Maintenance" },
  retired: { zh: "已退役", en: "Retired" },
};

type SearchParams = Record<string, string | string[] | undefined>;

function normalizeParam(value?: string | string[]) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function parseStatuses(value?: string | string[]) {
  const raw = Array.isArray(value) ? value : value?.split(",");
  if (!raw) return [];
  return raw.filter(Boolean);
}

async function fetchAssets(searchParams: SearchParams) {
  const baseUrl = await getRequestBaseUrl();
  const qs = new URLSearchParams();

  const allowList = ["search", "status", "category", "page", "pageSize"];
  allowList.forEach((key) => {
    const value = searchParams[key];
    if (Array.isArray(value)) {
      value.forEach((entry) => entry && qs.append(key, entry));
    } else if (typeof value === "string" && value) {
      qs.set(key, value);
    }
  });

  const url = `${baseUrl}/apps/asset-hub/api/assets${
    qs.toString() ? `?${qs.toString()}` : ""
  }`;

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("资产列表加载失败");
  }

  return (await response.json()) as {
    data: Asset[];
    meta: { total: number; page: number; pageSize: number };
  };
}

export default async function AssetListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ locale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const isChinese = locale === "zh";

  let assets: Asset[] = [];
  let meta = { total: 0, page: 1, pageSize: 10 };
  let errorMessage: string | null = null;

  try {
    const response = await fetchAssets(resolvedSearchParams);
    assets = response.data;
    meta = response.meta;
  } catch {
    errorMessage = isChinese
      ? "资产列表加载失败"
      : "Failed to load asset list.";
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  const buildPageLink = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(resolvedSearchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => entry && params.append(key, entry));
      } else if (typeof value === "string" && value) {
        params.set(key, value);
      }
    });
    params.set("page", page.toString());
    return `?${params.toString()}`;
  };

  const withLocale = (path: string) => `/${locale}${path}`;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">
          {isChinese ? "资产管理 / 列表" : "Assets / List"}
        </p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isChinese ? "资产列表" : "Asset List"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isChinese
                ? "支持关键词、状态与类别筛选，可随时新增资产记录。"
                : "Filter by keyword, status, or category and create new assets anytime."}
            </p>
          </div>
          <Link
            href={withLocale("/assets/new")}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow"
          >
            {isChinese ? "新增资产" : "New Asset"}
          </Link>
        </div>
      </header>

      <AssetFilters
        locale={locale}
        initialSearch={normalizeParam(resolvedSearchParams.search)}
        initialCategory={normalizeParam(resolvedSearchParams.category)}
        initialStatus={parseStatuses(resolvedSearchParams.status)}
      />

      {errorMessage ? (
        <div className="rounded-2xl border border-dashed border-destructive/50 bg-destructive/5 p-6 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : assets.length === 0 ? (
        <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          {isChinese
            ? "暂时没有符合条件的资产数据，请调整筛选条件或新增资产。"
            : "No assets match the filters. Adjust filters or add a new asset."}
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full table-auto text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  {isChinese ? "资产名称" : "Asset"}
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  {isChinese ? "类别" : "Category"}
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  {isChinese ? "状态" : "Status"}
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  {isChinese ? "使用人 / 部门" : "Owner / Dept"}
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  {isChinese ? "位置" : "Location"}
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  {isChinese ? "购入日期" : "Purchase Date"}
                </th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link
                      href={withLocale(`/assets/${asset.id}`)}
                      className="font-medium text-primary hover:underline"
                    >
                      {asset.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {asset.id}
                    </div>
                  </td>
                  <td className="px-4 py-3">{asset.category}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                      {isChinese
                        ? statusText[asset.status].zh
                        : statusText[asset.status].en}
                    </span>
                  </td>
                  <td className="px-4 py-3">{asset.owner}</td>
                  <td className="px-4 py-3">{asset.location}</td>
                  <td className="px-4 py-3">{asset.purchaseDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {!errorMessage && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center">
          <p>
            {isChinese
              ? `共 ${meta.total} 条记录`
              : `${meta.total} records total`}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`${withLocale("/assets/list")}${buildPageLink(Math.max(1, meta.page - 1))}`}
              aria-disabled={meta.page <= 1}
              className="rounded-full border px-3 py-1.5 text-xs font-medium aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              {isChinese ? "上一页" : "Prev"}
            </Link>
            <span>
              {isChinese
                ? `第 ${meta.page} / ${totalPages} 页`
                : `Page ${meta.page} / ${totalPages}`}
            </span>
            <Link
              href={`${withLocale("/assets/list")}${buildPageLink(
                Math.min(totalPages, meta.page + 1),
              )}`}
              aria-disabled={meta.page >= totalPages}
              className="rounded-full border px-3 py-1.5 text-xs font-medium aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              {isChinese ? "下一页" : "Next"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

