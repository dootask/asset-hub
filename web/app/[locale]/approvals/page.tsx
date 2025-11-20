import Link from "next/link";
import type { Metadata } from "next";
import ApprovalFilters from "@/components/approvals/ApprovalFilters";
import ApprovalStatusBadge from "@/components/approvals/ApprovalStatusBadge";
import ListPagination from "@/components/layout/ListPagination";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listApprovalRequests } from "@/lib/repositories/approvals";
import {
  APPROVAL_STATUSES,
  APPROVAL_TYPES,
  type ApprovalStatus,
  type ApprovalType,
} from "@/lib/types/approval";

type PageParams = { locale: string };
type PageProps = {
  params: Promise<PageParams>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Approvals - Asset Hub",
  };
}

function ensureSingle(value?: string | string[] | null) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function ApprovalsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const search = (await searchParams) ?? {};

  const statusFilter = ensureSingle(search.status);
  const typeFilter = ensureSingle(search.type);
  const roleFilter = ensureSingle(search.role);
  const userId = ensureSingle(search.userId);
  const pageParam = Number(ensureSingle(search.page));
  const page = Number.isNaN(pageParam) ? 1 : Math.max(1, pageParam);

  const statusValue = APPROVAL_STATUSES.find(
    (entry) => entry.value === statusFilter,
  )?.value as ApprovalStatus | undefined;

  const typeValue = APPROVAL_TYPES.find(
    (entry) => entry.value === typeFilter,
  )?.value as ApprovalType | undefined;

  const { data: approvals, meta } = listApprovalRequests({
    status: statusValue ? [statusValue] : undefined,
    type: typeValue ? [typeValue] : undefined,
    role: roleFilter === "my-requests" || roleFilter === "my-tasks" ? roleFilter : undefined,
    userId,
    assetId: ensureSingle(search.assetId),
    page,
    pageSize: 10,
  });

  const isChinese = locale === "zh";
  const typeLabelMap = Object.fromEntries(
    APPROVAL_TYPES.map((entry) => [
      entry.value,
      isChinese ? entry.labelZh : entry.labelEn,
    ]),
  );

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    Object.entries(search).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => entry && params.append(key, entry));
      } else if (typeof value === "string" && value) {
        params.set(key, value);
      }
    });
    return params;
  };

  const buildPageLink = (target: number) => {
    const params = buildQueryParams();
    params.set("page", String(target));
    return `?${params.toString()}`;
  };

  const exportHref = (() => {
    const params = buildQueryParams();
    const query = params.toString();
    return `/apps/asset-hub/api/approvals/export${query ? `?${query}` : ""}`;
  })();

  return (
    <div className="space-y-6">
      <header>
        <PageBreadcrumb
          locale={locale}
          items={[
            {
              href: `/${locale}`,
              labelZh: "首页",
              labelEn: "Dashboard",
            },
            {
              labelZh: "审批中心",
              labelEn: "Approvals",
            },
          ]}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {isChinese ? "审批列表" : "Approvals"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isChinese
                ? "跟踪所有资产审批的发起与进度。"
                : "Track all approval requests and their progress."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={exportHref}
              className="inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {isChinese ? "导出 CSV" : "Export CSV"}
            </a>
          </div>
        </div>
      </header>

      <ApprovalFilters
        locale={locale}
        status={statusFilter}
        type={typeFilter}
      />

      <section className="overflow-hidden rounded-2xl border bg-card">
        <Table className="text-sm">
          <TableHeader className="bg-muted/50">
            <TableRow className="text-left text-xs uppercase tracking-wide text-muted-foreground hover:bg-transparent">
              <TableHead className="px-4 py-3">{isChinese ? "标题" : "Title"}</TableHead>
              <TableHead className="px-4 py-3">{isChinese ? "类型" : "Type"}</TableHead>
              <TableHead className="px-4 py-3">{isChinese ? "状态" : "Status"}</TableHead>
              <TableHead className="px-4 py-3">{isChinese ? "申请人" : "Applicant"}</TableHead>
              <TableHead className="px-4 py-3">{isChinese ? "审批人" : "Approver"}</TableHead>
              <TableHead className="px-4 py-3">{isChinese ? "更新时间" : "Updated"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approvals.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-muted-foreground whitespace-normal"
                >
                  {isChinese ? "暂无审批记录" : "No approvals yet"}
                </TableCell>
              </TableRow>
            ) : (
              approvals.map((approval) => (
                <TableRow key={approval.id}>
                  <TableCell className="px-4 py-4 whitespace-normal">
                    <div className="font-medium text-foreground">
                      <Link
                        href={`/${locale}/approvals/${approval.id}`}
                        className="text-primary hover:underline"
                      >
                        {approval.title}
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground">#{approval.id}</p>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    {typeLabelMap[approval.type] ?? approval.type}
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <ApprovalStatusBadge status={approval.status} locale={locale} />
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    {approval.applicantName ?? approval.applicantId ?? "-"}
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    {approval.approverName ?? approval.approverId ?? "-"}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-xs text-muted-foreground">
                    {new Date(approval.updatedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {approvals.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
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


