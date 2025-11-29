import Link from "next/link";
import AssetFilters from "@/components/assets/AssetFilters";
import ListPagination from "@/components/layout/ListPagination";
import PageHeader from "@/components/layout/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Asset, getAssetStatusLabel } from "@/lib/types/asset";
import { listAssetCategories } from "@/lib/repositories/asset-categories";
import { listCompanies } from "@/lib/repositories/companies";
import { getApiClient } from "@/lib/http/client";
import AdminOnly from "@/components/auth/AdminOnly";

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
  const qs = new URLSearchParams();

  const allowList = ["search", "status", "category", "company", "page", "pageSize"];
  allowList.forEach((key) => {
    const value = searchParams[key];
    if (Array.isArray(value)) {
      value.forEach((entry) => entry && qs.append(key, entry));
    } else if (typeof value === "string" && value) {
      qs.set(key, value);
    }
  });

  const client = await getApiClient();
  const response = await client.get<{
    data: Asset[];
    meta: { total: number; page: number; pageSize: number };
  }>("/apps/asset-hub/api/assets", {
    params: Object.fromEntries(qs.entries()),
    headers: { "Cache-Control": "no-cache" },
  });

  return response.data;
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
  const categories = listAssetCategories();
  const companies = listCompanies();
  const companyMap = new Map(companies.map((company) => [company.code, company.name]));
  const categoryMap = new Map(
    categories.map((category) => [
      category.code,
      isChinese ? category.labelZh : category.labelEn,
    ]),
  );

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
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          {
            href: `/${locale}/assets`,
            labelZh: "资产管理",
            labelEn: "Assets",
          },
          {
            labelZh: "资产列表",
            labelEn: "Asset List",
          },
        ]}
        title={isChinese ? "资产列表" : "Asset List"}
        description={
          isChinese
            ? "支持关键词、公司、状态与类别筛选，可随时新增资产记录。"
            : "Filter by keyword, company, status, or category and create new assets anytime."
        }
        actions={
          <AdminOnly>
            <div className="flex items-center gap-2">
              <Link
                href={withLocale("/assets/new")}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow"
              >
                {isChinese ? "新增资产" : "New Asset"}
              </Link>
              <Link
                href={withLocale("/assets/categories")}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {isChinese ? "分类管理" : "Manage Categories"}
              </Link>
              <Link
                href={withLocale("/assets/import-export")}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {isChinese ? "导入 / 导出" : "Import / Export"}
              </Link>
            </div>
          </AdminOnly>
        }
      />

      <AssetFilters
        locale={locale}
        initialSearch={normalizeParam(resolvedSearchParams.search)}
        initialCategory={normalizeParam(resolvedSearchParams.category)}
        initialStatus={parseStatuses(resolvedSearchParams.status)}
        categories={categories}
        initialCompany={normalizeParam(resolvedSearchParams.company)}
        companies={companies}
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
          <Table className="text-sm">
            <TableHeader className="bg-muted/50">
              <TableRow className="text-left text-xs uppercase tracking-wide text-muted-foreground hover:bg-transparent">
                <TableHead className="px-4 py-3">{isChinese ? "资产名称" : "Asset"}</TableHead>
                <TableHead className="px-4 py-3">{isChinese ? "类别" : "Category"}</TableHead>
                <TableHead className="px-4 py-3">{isChinese ? "所属公司" : "Company"}</TableHead>
                <TableHead className="px-4 py-3">{isChinese ? "状态" : "Status"}</TableHead>
                <TableHead className="px-4 py-3">
                  {isChinese ? "使用人 / 部门" : "Owner / Dept"}
                </TableHead>
                <TableHead className="px-4 py-3">{isChinese ? "位置" : "Location"}</TableHead>
                <TableHead className="px-4 py-3">
                  {isChinese ? "购入日期" : "Purchase Date"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="px-4 py-3 whitespace-normal">
                    <Link
                      href={withLocale(`/assets/${asset.id}`)}
                      className="font-medium text-primary hover:underline line-clamp-2 break-words"
                      title={asset.name}
                    >
                      {asset.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{asset.id}</div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {categoryMap.get(asset.category) ?? asset.category}
                  </TableCell>
                    <TableCell className="px-4 py-3">
                      {asset.companyCode
                        ? companyMap.get(asset.companyCode) ?? asset.companyCode
                        : isChinese
                          ? "未指定"
                          : "Unassigned"}
                    </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                      {getAssetStatusLabel(asset.status, locale)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">{asset.owner}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-normal">{asset.location}</TableCell>
                  <TableCell className="px-4 py-3">{asset.purchaseDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {!errorMessage && (
        <div className="flex flex-col gap-3 rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p className="shrink-0">
            {isChinese
              ? `共 ${meta.total} 条记录`
              : `${meta.total} records total`}
          </p>
          <ListPagination
            locale={locale}
            currentPage={meta.page}
            totalPages={totalPages}
            getHref={(page) => buildPageLink(page)}
            className="md:justify-end"
          />
        </div>
      )}
    </div>
  );
}
