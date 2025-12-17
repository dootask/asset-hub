"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import ApprovalStatusBadge from "@/components/approvals/ApprovalStatusBadge";
import ApprovalActionForm from "@/components/approvals/ApprovalActionForm";
import OperationTemplateView from "@/components/operations/OperationTemplateView";
import ApproverReassignmentsView from "@/components/approvals/ApproverReassignmentsView";
import { Spinner } from "@/components/ui/spinner";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import { extractOperationTemplateMetadata } from "@/lib/utils/operation-template";
import { OPERATION_TEMPLATE_LABELS } from "@/lib/constants/operation-template-labels";
import type { ApprovalRequest } from "@/lib/types/approval";
import type { OperationTemplateMetadata } from "@/lib/types/operation-template";

const RESERVED_METADATA_KEYS = new Set([
  "operationTemplate",
  "configSnapshot",
  "approverReassignments",
]);

type ApproverReassignment = {
  at: string;
  from: { id: string | null; name: string | null };
  to: { id: string | null; name: string | null };
  actor: { id: string | null; name: string | null };
  comment?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type PurchaseAssetMode = "new" | "existing";

function resolvePurchaseAssetMode(
  metadata?: Record<string, unknown> | null,
): PurchaseAssetMode | null {
  if (!metadata) return null;
  const purchaseAsset = (metadata as { purchaseAsset?: unknown }).purchaseAsset;
  if (isRecord(purchaseAsset)) {
    const mode = (purchaseAsset as { mode?: unknown }).mode;
    if (mode === "new" || mode === "existing") {
      return mode;
    }
  }
  const legacyMode = (metadata as { purchaseAssetMode?: unknown })
    .purchaseAssetMode;
  if (legacyMode === "new" || legacyMode === "existing") {
    return legacyMode;
  }
  return null;
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
    const comment = typeof entry.comment === "string" ? entry.comment : null;

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
      comment,
    });
  });

  return result;
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

type ApprovalDetailPayload = {
  approval: ApprovalRequest;
  ccRecipients: Array<{ userId: string; userName?: string | null }>;
  asset: { id: string; name: string; assetNo?: string | null } | null;
  consumable: { id: string; name: string; consumableNo?: string | null } | null;
  operation: { id: string; metadata?: Record<string, unknown> | null } | null;
  dootaskTodoLinkBase: string | null;
};

export default function ApprovalDetailPageClient(props: {
  locale: string;
  id: string;
}) {
  const router = useRouter();
  const isChinese = props.locale === "zh";
  const mountedRef = useRef(false);
  const [data, setData] = useState<ApprovalDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!mountedRef.current) return;
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setErrorMessage(null);
      setForbidden(false);
      try {
        const client = await getApiClient();
        const resp = await client.get<{ data: ApprovalDetailPayload }>(
          `/apps/asset-hub/api/approvals/${props.id}/detail`,
          { headers: { "Cache-Control": "no-cache" } },
        );
        if (!mountedRef.current) return;
        setData(resp.data.data);
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 403) {
          setForbidden(true);
          setData(null);
          return;
        }
        const message = extractApiErrorMessage(
          err,
          isChinese ? "审批详情加载失败" : "Failed to load approval.",
        );
        setErrorMessage(message);
        setData(null);
      } finally {
        if (!mountedRef.current) return;
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [props.id, isChinese],
  );

  useEffect(() => {
    mountedRef.current = true;
    void (async () => {
      await load();
    })();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const handleUpdated = useCallback(async () => {
    await load({ silent: true });
  }, [load]);

  const approval = data?.approval ?? null;

  const derived = useMemo(() => {
    if (!approval) {
      return null;
    }
    const metadataSplit = splitMetadata(approval.metadata as Record<string, unknown> | null);
    const operationTemplateMetadata =
      extractOperationTemplateMetadata(data?.operation?.metadata ?? undefined) ??
      extractOperationTemplateMetadata(approval.metadata ?? undefined);
    const approverReassignmentsFromApproval = parseApproverReassignments(
      approval.metadata as Record<string, unknown> | null,
    );
    const approverReassignments = approverReassignmentsFromApproval.length
      ? approverReassignmentsFromApproval
      : parseApproverReassignments(data?.operation?.metadata ?? undefined);
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

    const valuesSource =
      (mergedOperationMetadata?.values as Record<string, unknown> | undefined) ??
      (operationTemplateMetadata?.values as Record<string, unknown> | undefined);
    const hasCost = Boolean(valuesSource && "cost" in valuesSource);
    const costValue = valuesSource?.cost;
    const purchaseMode = resolvePurchaseAssetMode(
      approval.metadata as Record<string, unknown> | null,
    );
    const hasTarget = Boolean(
      approval.consumableId ||
        approval.assetId ||
        (approval.type === "purchase" &&
          purchaseMode === "new" &&
          isRecord(((approval.metadata ?? {}) as Record<string, unknown>).newAsset)),
    );
    const canSyncPurchasePrice = hasCost && hasTarget;
    const syncPurchasePriceOption = canSyncPurchasePrice
      ? {
          target: approval.consumableId ? ("consumable" as const) : ("asset" as const),
          cost: costValue as string | number | null | undefined,
          initialChecked:
            typeof (approval.metadata as { syncPurchasePrice?: unknown } | null)
              ?.syncPurchasePrice === "boolean"
              ? Boolean(
                  (approval.metadata as { syncPurchasePrice?: unknown } | null)
                    ?.syncPurchasePrice,
                )
              : true,
        }
      : undefined;

    return {
      metadataSplit,
      mergedOperationMetadata,
      approverReassignments,
      hasOperationDetails,
      syncPurchasePriceOption,
    };
  }, [approval, data?.operation?.metadata]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border bg-muted/30 p-12">
        <Spinner className="h-7 w-7 text-primary" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
        {isChinese ? "当前用户无权查看该审批。" : "You do not have access to this approval."}{" "}
        <button
          className="underline underline-offset-4"
          onClick={() => router.push(`/${props.locale}/approvals`)}
        >
          {isChinese ? "返回审批列表" : "Back to approvals"}
        </button>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-dashed border-destructive/50 bg-destructive/5 p-6 text-sm text-destructive">
        {errorMessage}
      </div>
    );
  }

  if (!approval || !derived) {
    return (
      <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
        {isChinese ? "审批不存在或已被删除。" : "Approval not found."}{" "}
        <Link
          href={`/${props.locale}/approvals`}
          className="underline underline-offset-4"
        >
          {isChinese ? "返回审批列表" : "Back to approvals"}
        </Link>
      </div>
    );
  }

  const asset = data?.asset ?? null;
  const consumable = data?.consumable ?? null;
  const ccRecipients = data?.ccRecipients ?? [];
  const dootaskTodoLinkBase = data?.dootaskTodoLinkBase ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        locale={props.locale}
        items={[
          {
            href: `/${props.locale}/approvals`,
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
        actions={
          <div className="flex items-center gap-2">
            {refreshing ? (
              <Spinner className="h-4 w-4 text-muted-foreground" />
            ) : null}
            <ApprovalStatusBadge status={approval.status} locale={props.locale} />
          </div>
        }
      />

      {approval.externalTodoId && (
        <section className="rounded-2xl border bg-card/70 p-4 text-sm text-muted-foreground">
          <p className="font-semibold">
            {isChinese ? "DooTask 待办" : "DooTask Todo"}
          </p>
          <p className="mt-1">
            ID: <span className="font-mono">{approval.externalTodoId}</span>
          </p>
          {dootaskTodoLinkBase ? (
            <a
              className="mt-2 inline-flex text-sm text-primary hover:underline"
              href={`${dootaskTodoLinkBase.replace(/\/$/, "")}/${approval.externalTodoId}`}
              target="_blank"
              rel="noreferrer"
            >
              {isChinese ? "在 DooTask 中打开" : "Open in DooTask"}
            </a>
          ) : null}
        </section>
      )}

      {approval.assetId && (
        <section className="rounded-2xl border bg-muted/30 p-4 text-sm">
          <p className="text-xs text-muted-foreground">
            {isChinese ? "关联资产" : "Linked Asset"}
          </p>
          {asset ? (
            <Link
              href={`/${props.locale}/assets/${asset.id}`}
              className="mt-1 inline-flex items-center gap-2 text-primary hover:underline"
            >
              {asset.name}{" "}
              <span className="text-xs text-muted-foreground">
                #{asset.assetNo || asset.id}
              </span>
            </Link>
          ) : (
            <p className="mt-1 text-muted-foreground">#{approval.assetId}</p>
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
              href={`/${props.locale}/consumables/${consumable.id}`}
              className="mt-1 inline-flex items-center gap-2 text-primary hover:underline"
            >
              {consumable.name}{" "}
              <span className="text-xs text-muted-foreground">
                #{consumable.consumableNo || consumable.id}
              </span>
            </Link>
          ) : (
            <p className="mt-1 text-muted-foreground">#{approval.consumableId}</p>
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
            <p className="text-sm leading-relaxed">{approval.reason ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {isChinese ? "审批结果" : "Result"}
            </p>
            <p className="text-sm leading-relaxed">
              {approval.result ?? (isChinese ? "待处理" : "Pending")}
            </p>
          </div>
          {derived.hasOperationDetails && (
            <div>
              <p className="text-xs text-muted-foreground">
                {isChinese ? "操作详情" : "Operation Details"}
              </p>
              {derived.mergedOperationMetadata && (
                <OperationTemplateView
                  metadata={derived.mergedOperationMetadata}
                  labels={derived.metadataSplit.labels}
                  locale={props.locale}
                  className="mt-2"
                />
              )}
              {derived.approverReassignments.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">
                    {isChinese ? "审批人变更记录" : "Approver Reassignments"}
                  </p>
                  <div className="mt-2">
                    <ApproverReassignmentsView
                      locale={props.locale}
                      items={derived.approverReassignments}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {derived.metadataSplit.rest && (
            <div>
              <p className="text-xs text-muted-foreground">
                {isChinese ? "原始元数据" : "Raw Metadata"}
              </p>
              <pre className="mt-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                {JSON.stringify(derived.metadataSplit.rest, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </section>

      {approval.status === "pending" && (
        <ApprovalActionForm
          approvalId={approval.id}
          approvalType={approval.type}
          locale={props.locale}
          approverId={approval.approverId}
          approverName={approval.approverName}
          applicantId={approval.applicantId}
          syncPurchasePriceOption={derived.syncPurchasePriceOption}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
