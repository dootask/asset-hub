import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  getApprovalRequestById,
  isApprovalCcRecipient,
  listApprovalCcRecipients,
} from "@/lib/repositories/approvals";
import { getAssetById } from "@/lib/repositories/assets";
import { getAssetOperationById } from "@/lib/repositories/asset-operations";
import { getConsumableById } from "@/lib/repositories/consumables";
import ApprovalStatusBadge from "@/components/approvals/ApprovalStatusBadge";
import ApprovalActionForm from "@/components/approvals/ApprovalActionForm";
import PageHeader from "@/components/layout/PageHeader";
import OperationTemplateView from "@/components/operations/OperationTemplateView";
import ApproverReassignmentsView from "@/components/approvals/ApproverReassignmentsView";
import { extractOperationTemplateMetadata } from "@/lib/utils/operation-template";
import type { OperationTemplateMetadata } from "@/lib/types/operation-template";
import { appConfig } from "@/lib/config";
import { OPERATION_TEMPLATE_LABELS } from "@/lib/constants/operation-template-labels";
import { getServerUserId } from "@/lib/server/auth";
import { isAdminUser } from "@/lib/utils/permissions";

const RESERVED_METADATA_KEYS = new Set([
  "operationTemplate",
  "configSnapshot",
  "approverReassignments",
]);

type PageParams = { locale: string; id: string };
type PageProps = {
  params: Promise<PageParams>;
};

type ApproverReassignment = {
  at: string;
  from: { id: string | null; name: string | null };
  to: { id: string | null; name: string | null };
  actor: { id: string | null; name: string | null };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseApproverReassignments(
  metadata?: Record<string, unknown> | null,
): ApproverReassignment[] {
  if (!metadata) return [];
  const value = metadata.approverReassignments;
  if (!Array.isArray(value)) return [];

  const result: ApproverReassignment[] = [];
  value.forEach((entry) => {
    if (!isRecord(entry)) return;
    if (typeof entry.at !== "string" || !entry.at) return;

    const from = isRecord(entry.from) ? entry.from : {};
    const to = isRecord(entry.to) ? entry.to : {};
    const actor = isRecord(entry.actor) ? entry.actor : {};

    result.push({
      at: entry.at,
      from: {
        id: typeof from.id === "string" ? from.id : null,
        name: typeof from.name === "string" ? from.name : null,
      },
      to: {
        id: typeof to.id === "string" ? to.id : null,
        name: typeof to.name === "string" ? to.name : null,
      },
      actor: {
        id: typeof actor.id === "string" ? actor.id : null,
        name: typeof actor.name === "string" ? actor.name : null,
      },
    });
  });

  return result;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Approval ${id} - Asset Hub`,
  };
}

function splitMetadata(metadata?: Record<string, unknown> | null) {
  if (!metadata) {
    const labels = { ...OPERATION_TEMPLATE_LABELS };
    return {
      known: [] as Array<{ key: string; value: string }>,
      rest: null as Record<string, unknown> | null,
      labels,
    };
  }
  const known: Array<{ key: string; value: string }> = [];
  const rest: Record<string, unknown> = {};

  Object.entries(metadata).forEach(([key, value]) => {
    if (RESERVED_METADATA_KEYS.has(key)) {
      return;
    }
    if (OPERATION_TEMPLATE_LABELS[key]) {
      known.push({
        key,
        value: String(value ?? ""),
      });
    } else {
      rest[key] = value;
    }
  });

  const labels = { ...OPERATION_TEMPLATE_LABELS };
  return {
    known,
    rest: Object.keys(rest).length ? rest : null,
    labels,
  };
}

export default async function ApprovalDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const userId = await getServerUserId();
  if (userId === null || userId === undefined) {
    redirect(`/${locale}/approvals`);
  }
  const currentUserId = String(userId);
  const approval = getApprovalRequestById(id);

  if (!approval) {
    notFound();
  }

  if (!isAdminUser(currentUserId)) {
    const canRead =
      approval.applicantId === currentUserId ||
      approval.approverId === currentUserId ||
      isApprovalCcRecipient(approval.id, currentUserId);
    if (!canRead) {
      redirect(`/${locale}/approvals`);
    }
  }

  const ccRecipients = listApprovalCcRecipients(approval.id);
  const asset = approval.assetId ? getAssetById(approval.assetId) : null;
  const consumable = approval.consumableId
    ? getConsumableById(approval.consumableId)
    : null;
  const operation = approval.operationId
    ? getAssetOperationById(approval.operationId)
    : null;
  const isChinese = locale === "zh";
  const metadataSplit = splitMetadata(approval.metadata);
  const operationTemplateMetadata =
    extractOperationTemplateMetadata(operation?.metadata ?? undefined) ??
    extractOperationTemplateMetadata(approval.metadata ?? undefined);
  const approverReassignmentsFromApproval = parseApproverReassignments(
    approval.metadata,
  );
  const approverReassignments = approverReassignmentsFromApproval.length
    ? approverReassignmentsFromApproval
    : parseApproverReassignments(operation?.metadata ?? undefined);
  const mergedOperationMetadata: OperationTemplateMetadata | null =
    operationTemplateMetadata || metadataSplit.known.length
      ? {
          snapshot: operationTemplateMetadata?.snapshot,
          values: {
            ...(operationTemplateMetadata?.values ?? {}),
            ...Object.fromEntries(
              metadataSplit.known.map((item) => [item.key, item.value]),
            ),
          },
        }
      : null;
  const hasOperationDetails =
    mergedOperationMetadata !== null || approverReassignments.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          {
            href: `/${locale}/approvals`,
            labelZh: "审批中心",
            labelEn: "Approvals",
          },
          {
            labelZh: "审批详情",
            labelEn: "Approval Detail",
          },
        ]}
        title={approval.title}
        description={`#${approval.id}`}
        actions={<ApprovalStatusBadge status={approval.status} locale={locale} />}
      />

      {approval.externalTodoId && (
        <section className="rounded-2xl border bg-card/70 p-4 text-sm text-muted-foreground">
          <p className="font-semibold">
            {isChinese ? "DooTask 待办" : "DooTask Todo"}
          </p>
          <p className="mt-1">
            ID: <span className="font-mono">{approval.externalTodoId}</span>
          </p>
          {appConfig.dootaskTodo.linkBase && (
            <a
              className="mt-2 inline-flex text-sm text-primary hover:underline"
              href={`${appConfig.dootaskTodo.linkBase.replace(/\/$/, "")}/${approval.externalTodoId}`}
              target="_blank"
              rel="noreferrer"
            >
              {isChinese ? "在 DooTask 中打开" : "Open in DooTask"}
            </a>
          )}
        </section>
      )}

      {approval.assetId && (
        <section className="rounded-2xl border bg-muted/30 p-4 text-sm">
          <p className="text-xs text-muted-foreground">
            {isChinese ? "关联资产" : "Linked Asset"}
          </p>
          {asset ? (
            <Link
              href={`/${locale}/assets/${asset.id}`}
              className="mt-1 inline-flex items-center gap-2 text-primary hover:underline"
            >
              {asset.name}{" "}
              <span className="text-xs text-muted-foreground">
                #{asset.assetNo || asset.id}
              </span>
            </Link>
          ) : (
            <p className="mt-1 text-muted-foreground">
              #{approval.assetId}
            </p>
          )}
        </section>
      )}

      {approval.consumableId && (
        <section className="rounded-2xl border bg-muted/30 p-4 text-sm">
          <p className="text-xs text-muted-foreground">
            {isChinese ? "关联耗材" : "Linked Consumable"}
          </p>
          {consumable ? (
            <Link
              href={`/${locale}/consumables/${consumable.id}`}
              className="mt-1 inline-flex items-center gap-2 text-primary hover:underline"
            >
              {consumable.name}{" "}
              <span className="text-xs text-muted-foreground">
                #{consumable.id}
              </span>
            </Link>
          ) : (
            <p className="mt-1 text-muted-foreground">
              #{approval.consumableId}
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl border bg-card/80 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">
              {isChinese ? "申请人" : "Applicant"}
            </p>
            <p className="text-sm font-medium">
              {approval.applicantName ?? approval.applicantId ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {isChinese ? "审批人" : "Approver"}
            </p>
            <p className="text-sm font-medium">
              {approval.approverName ?? approval.approverId ?? "-"}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-muted-foreground">
              {isChinese ? "抄送" : "CC"}
            </p>
            <p className="text-sm font-medium">
              {ccRecipients.length > 0
                ? ccRecipients
                    .map((entry) => entry.userName ?? entry.userId)
                    .join("、")
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {isChinese ? "提交时间" : "Created"}
            </p>
            <p className="text-sm font-medium">
              {new Date(approval.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {isChinese ? "最近更新" : "Last updated"}
            </p>
            <p className="text-sm font-medium">
              {new Date(approval.updatedAt).toLocaleString()}
            </p>
          </div>
          {approval.completedAt && (
            <div>
              <p className="text-xs text-muted-foreground">
                {isChinese ? "完成时间" : "Completed"}
              </p>
              <p className="text-sm font-medium">
                {new Date(approval.completedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {isChinese ? "审批事由" : "Reason"}
            </p>
            <p className="text-sm leading-relaxed">
              {approval.reason ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {isChinese ? "审批结果" : "Result"}
            </p>
            <p className="text-sm leading-relaxed">
              {approval.result ?? (isChinese ? "待处理" : "Pending")}
            </p>
          </div>
          {hasOperationDetails && (
            <div>
              <p className="text-xs text-muted-foreground">
                {isChinese ? "操作详情" : "Operation Details"}
              </p>
              {mergedOperationMetadata && (
                <OperationTemplateView
                  metadata={mergedOperationMetadata}
                  labels={metadataSplit.labels}
                  locale={locale}
                  className="mt-2"
                />
              )}
              {approverReassignments.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">
                    {isChinese ? "审批人变更记录" : "Approver Reassignments"}
                  </p>
                  <div className="mt-2">
                    <ApproverReassignmentsView
                      locale={locale}
                      items={approverReassignments}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {metadataSplit.rest && (
            <div>
              <p className="text-xs text-muted-foreground">
                {isChinese ? "原始元数据" : "Raw Metadata"}
              </p>
              <pre className="mt-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                {JSON.stringify(metadataSplit.rest, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </section>

      {approval.status === "pending" && (
        <ApprovalActionForm
          approvalId={approval.id}
          approvalType={approval.type}
          locale={locale}
          approverId={approval.approverId}
          approverName={approval.approverName}
          applicantId={approval.applicantId}
        />
      )}
    </div>
  );
}
