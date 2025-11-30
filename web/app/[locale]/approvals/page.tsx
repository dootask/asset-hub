"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ApprovalFilters from "@/components/approvals/ApprovalFilters";
import ApprovalRoleTabs from "@/components/approvals/ApprovalRoleTabs";
import ApprovalStatusBadge from "@/components/approvals/ApprovalStatusBadge";
import ListPagination from "@/components/layout/ListPagination";
import PageHeader from "@/components/layout/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  APPROVAL_TYPES,
  type ApprovalRequest,
} from "@/lib/types/approval";
import type { OperationTemplateFieldWidget } from "@/lib/types/operation-template";
import { extractOperationTemplateMetadata } from "@/lib/utils/operation-template";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";

type PageParams = { locale: string };
type PageProps = {
  params: Promise<PageParams>;
};

function formatSummaryValue(
  value: unknown,
  widget?: OperationTemplateFieldWidget,
  locale?: string,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    const printable = value
      .filter((entry): entry is string => typeof entry === "string")
      .slice(0, 2)
      .join(", ");
    return printable || null;
  }
  if (widget === "number" && typeof value === "number") {
    return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
      maximumFractionDigits: 2,
    }).format(value);
  }
  if (widget === "date" && typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }
  return String(value);
}

function buildOperationSummary(
  approval: ApprovalRequest,
  locale: string,
): string {
  const templateMetadata = extractOperationTemplateMetadata(
    approval.metadata ?? undefined,
  );
  const isChinese = locale === "zh";

  if (templateMetadata) {
    const fields = templateMetadata.snapshot?.fields ?? [];
    const values = templateMetadata.values ?? {};
    const entries = fields
      .map((field) => {
        const formatted = formatSummaryValue(values[field.key], field.widget, locale);
        if (!formatted) {
          return null;
        }
        const label = isChinese ? field.labelZh : field.labelEn;
        return `${label}: ${formatted}`;
      })
      .filter((entry): entry is string => !!entry);
    const summary = entries.slice(0, 2).join(" · ");
    if (summary) {
      return summary;
    }
  }

  if (approval.reason) {
    return approval.reason.length > 80
      ? `${approval.reason.slice(0, 77)}...`
      : approval.reason;
  }
  return isChinese ? "暂无摘要" : "No additional details";
}

export default function ApprovalsPage({ params }: PageProps) {
  const { locale } = use(params);
  const searchParams = useSearchParams();
  const isChinese = locale === "zh";
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 10 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const statusFilter = searchParams?.get("status") ?? undefined;
  const typeFilter = searchParams?.get("type") ?? undefined;

  useEffect(() => {
    let cancelled = false;
    async function loadApprovals() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const client = await getApiClient();
        const params = Object.fromEntries(searchParams?.entries() ?? []);
        const { data } = await client.get<{
          data: ApprovalRequest[];
          meta: { total: number; page: number; pageSize: number };
        }>("/apps/asset-hub/api/approvals", {
          params,
          headers: { "Cache-Control": "no-cache" },
        });
        if (cancelled) return;
        setApprovals(data.data);
        setMeta(data.meta);
      } catch (err) {
        if (cancelled) return;
        const message = extractApiErrorMessage(
          err,
          isChinese ? "审批列表加载失败" : "Failed to load approvals.",
        );
        setErrorMessage(message);
        setApprovals([]);
        setMeta({ total: 0, page: 1, pageSize: 10 });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadApprovals();
    return () => {
      cancelled = true;
    };
  }, [searchParams, isChinese]);

  const typeLabelMap = Object.fromEntries(
    APPROVAL_TYPES.map((entry) => [
      entry.value,
      isChinese ? entry.labelZh : entry.labelEn,
    ]),
  );

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  const buildQueryParams = () => {
    const params = new URLSearchParams(searchParams ?? undefined);
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
      <PageHeader
        locale={locale}
        items={[
          {
            labelZh: "审批中心",
            labelEn: "Approvals",
          },
        ]}
        title={isChinese ? "审批列表" : "Approvals"}
        description={
          isChinese
            ? "跟踪所有资产审批的发起与进度。"
            : "Track all approval requests and their progress."
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/approvals/new`}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {isChinese ? "发起采购" : "New Purchase"}
            </Link>
            <a
              href={exportHref}
              className="inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {isChinese ? "导出 CSV" : "Export CSV"}
            </a>
          </div>
        }
      />

      <ApprovalRoleTabs locale={locale} />

      <ApprovalFilters locale={locale} status={statusFilter ?? undefined} type={typeFilter ?? undefined} />

      {errorMessage ? (
        <div className="rounded-2xl border border-dashed border-destructive/50 bg-destructive/5 p-6 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : loading ? (
        <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          {isChinese ? "加载中..." : "Loading..."}
        </div>
      ) : (
      <section className="overflow-hidden rounded-2xl border bg-card">
        <Table className="text-sm">
          <TableHeader className="bg-muted/50">
            <TableRow className="text-left text-xs uppercase tracking-wide text-muted-foreground hover:bg-transparent">
              <TableHead className="px-4 py-3">{isChinese ? "标题" : "Title"}</TableHead>
              <TableHead className="px-4 py-3">{isChinese ? "类型" : "Type"}</TableHead>
              <TableHead className="px-4 py-3">{isChinese ? "状态" : "Status"}</TableHead>
              <TableHead className="px-4 py-3">{isChinese ? "操作概要" : "Summary"}</TableHead>
              <TableHead className="px-4 py-3">{isChinese ? "申请人" : "Applicant"}</TableHead>
              <TableHead className="px-4 py-3">{isChinese ? "审批人" : "Approver"}</TableHead>
              <TableHead className="px-4 py-3">{isChinese ? "更新时间" : "Updated"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approvals.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-muted-foreground whitespace-normal"
                >
                  {isChinese ? "暂无审批记录" : "No approvals yet"}
                </TableCell>
              </TableRow>
            ) : (
              approvals.map((approval) => {
                const summary = buildOperationSummary(approval, locale);
                return (
                  <TableRow key={approval.id}>
                    <TableCell className="px-4 py-3 whitespace-normal">
                      <div className="font-medium text-foreground">
                        <Link
                          href={`/${locale}/approvals/${approval.id}`}
                          className="font-medium text-primary hover:underline line-clamp-2 break-words"
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
                    <TableCell className="px-4 py-4 text-xs text-muted-foreground whitespace-normal">
                      <div className="line-clamp-2 break-words">{summary}</div>
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
                );
              })
            )}
          </TableBody>
        </Table>
      </section>
      )}

      {approvals.length > 0 && !errorMessage && (
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
