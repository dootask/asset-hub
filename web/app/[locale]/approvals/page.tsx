import Link from "next/link";
import type { Metadata } from "next";
import ApprovalTabs from "@/components/approvals/ApprovalTabs";
import ApprovalFilters from "@/components/approvals/ApprovalFilters";
import ApprovalStatusBadge from "@/components/approvals/ApprovalStatusBadge";
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
    userId: userId ?? undefined,
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

  const nextPage = meta.page + 1;
  const prevPage = meta.page - 1;
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  const buildPageLink = (target: number) => {
    const params = new URLSearchParams();
    Object.entries(search).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => entry && params.append(key, entry));
      } else if (typeof value === "string" && value) {
        params.set(key, value);
      }
    });
    params.set("page", String(target));
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">
          {isChinese ? "审批中心" : "Approval Center"}
        </p>
        <h1 className="text-2xl font-semibold">
          {isChinese ? "审批列表" : "Approvals"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isChinese
            ? "跟踪所有资产审批的发起与进度。"
            : "Track all approval requests and their progress."}
        </p>
      </header>

      <ApprovalTabs
        locale={locale}
        currentRole={
          roleFilter === "my-requests" || roleFilter === "my-tasks"
            ? roleFilter
            : undefined
        }
        userId={userId ?? undefined}
      />

      <ApprovalFilters
        locale={locale}
        status={statusFilter}
        type={typeFilter}
      />

      <section className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full table-auto text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{isChinese ? "标题" : "Title"}</th>
              <th className="px-4 py-3 font-medium">{isChinese ? "类型" : "Type"}</th>
              <th className="px-4 py-3 font-medium">{isChinese ? "状态" : "Status"}</th>
              <th className="px-4 py-3 font-medium">{isChinese ? "申请人" : "Applicant"}</th>
              <th className="px-4 py-3 font-medium">{isChinese ? "审批人" : "Approver"}</th>
              <th className="px-4 py-3 font-medium">{isChinese ? "更新时间" : "Updated"}</th>
            </tr>
          </thead>
          <tbody>
            {approvals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {isChinese ? "暂无审批记录" : "No approvals yet"}
                </td>
              </tr>
            ) : (
              approvals.map((approval) => (
                <tr key={approval.id} className="border-t">
                  <td className="px-4 py-4">
                    <div className="font-medium text-foreground">
                      <Link
                        href={`/${locale}/approvals/${approval.id}`}
                        className="text-primary hover:underline"
                      >
                        {approval.title}
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground">#{approval.id}</p>
                  </td>
                  <td className="px-4 py-4">
                    {typeLabelMap[approval.type] ?? approval.type}
                  </td>
                  <td className="px-4 py-4">
                    <ApprovalStatusBadge status={approval.status} locale={locale} />
                  </td>
                  <td className="px-4 py-4">
                    {approval.applicantName ?? approval.applicantId ?? "-"}
                  </td>
                  <td className="px-4 py-4">
                    {approval.approverName ?? approval.approverId ?? "-"}
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {new Date(approval.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {approvals.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {isChinese
              ? `共 ${meta.total} 条 · 第 ${meta.page} / ${totalPages} 页`
              : `${meta.total} records · Page ${meta.page} of ${totalPages}`}
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={buildPageLink(Math.max(1, prevPage))}
              aria-disabled={meta.page <= 1}
              className="rounded-full border px-3 py-1.5 text-xs font-medium aria-disabled:opacity-50"
            >
              {isChinese ? "上一页" : "Prev"}
            </Link>
            <Link
              href={buildPageLink(Math.min(totalPages, nextPage))}
              aria-disabled={meta.page >= totalPages}
              className="rounded-full border px-3 py-1.5 text-xs font-medium aria-disabled:opacity-50"
            >
              {isChinese ? "下一页" : "Next"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}


