import { NextResponse } from "next/server";
import { listDeletedAssets } from "@/lib/repositories/assets";
import type { AssetStatus } from "@/lib/types/asset";
import { ASSET_STATUSES } from "@/lib/types/asset";
import { ensureAdminApiAccess } from "@/lib/server/api-guards";

function parseStatuses(searchParams: URLSearchParams): AssetStatus[] | undefined {
  const rawStatuses = [
    ...searchParams.getAll("status"),
    ...(searchParams.get("status")?.split(",") ?? []),
  ].filter(Boolean);

  const normalized = Array.from(new Set(rawStatuses)).filter((value) =>
    ASSET_STATUSES.includes(value as AssetStatus),
  ) as AssetStatus[];

  return normalized.length ? normalized : undefined;
}

export async function GET(request: Request) {
  const forbidden = ensureAdminApiAccess(
    request,
    "只有系统管理员可以查看已删除资产。",
  );
  if (forbidden) {
    return forbidden;
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const search = searchParams.get("search") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const status = parseStatuses(searchParams);
  const company = searchParams.get("company") ?? undefined;
  const normalizedCompany =
    company && company.trim().length > 0 ? company.trim().toUpperCase() : undefined;

  const result = listDeletedAssets({
    page: Number.isNaN(page) ? 1 : page,
    pageSize: Number.isNaN(pageSize) ? 10 : pageSize,
    search: search?.trim() || undefined,
    category: category?.trim() || undefined,
    companyCode: normalizedCompany,
    status,
  });

  return NextResponse.json({
    data: result.items,
    meta: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    },
  });
}
