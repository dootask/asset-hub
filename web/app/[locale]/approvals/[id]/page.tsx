import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getApprovalRequestById } from "@/lib/repositories/approvals";
import { getAssetById } from "@/lib/repositories/assets";
import { getAssetOperationById } from "@/lib/repositories/asset-operations";
import ApprovalStatusBadge from "@/components/approvals/ApprovalStatusBadge";
import ApprovalActionForm from "@/components/approvals/ApprovalActionForm";
import PageHeader from "@/components/layout/PageHeader";
import OperationTemplateView from "@/components/operations/OperationTemplateView";
import { extractOperationTemplateMetadata } from "@/lib/utils/operation-template";
import { appConfig } from "@/lib/config";

const knownLabels: Array<{ key: string; labelZh: string; labelEn: string }> = [
  { key: "amount", labelZh: "金额", labelEn: "Amount" },
  { key: "currency", labelZh: "币种", labelEn: "Currency" },
  { key: "initiatedFrom", labelZh: "来源", labelEn: "Source" },
  { key: "reason", labelZh: "原因", labelEn: "Reason" },
];
const RESERVED_METADATA_KEYS = new Set(["operationTemplate", "configSnapshot"]);

type PageParams = { locale: string; id: string };
type PageProps = {
  params: Promise<PageParams>;
};

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
    const labels = Object.fromEntries(
      knownLabels.map((item) => [item.key, item]),
    );
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
    const match = knownLabels.find((item) => item.key === key);
    if (match) {
      known.push({
        key: match.key,
        value: String(value ?? ""),
      });
    } else {
      rest[key] = value;
    }
  });

  const labels = Object.fromEntries(knownLabels.map((item) => [item.key, item]));
  return {
    known,
    rest: Object.keys(rest).length ? rest : null,
    labels,
  };
}

export default async function ApprovalDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const approval = getApprovalRequestById(id);

  if (!approval) {
    notFound();
  }

  const asset = approval.assetId ? getAssetById(approval.assetId) : null;
  const operation = approval.operationId
    ? getAssetOperationById(approval.operationId)
    : null;
  const isChinese = locale === "zh";
  const metadataSplit = splitMetadata(approval.metadata);
  const operationTemplateMetadata =
    extractOperationTemplateMetadata(operation?.metadata ?? undefined) ??
    extractOperationTemplateMetadata(approval.metadata ?? undefined);

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

      {asset && (
        <section className="rounded-2xl border bg-muted/30 p-4 text-sm">
          <p className="text-xs text-muted-foreground">
            {isChinese ? "关联资产" : "Linked Asset"}
          </p>
          <Link
            href={`/${locale}/assets/${asset.id}`}
            className="mt-1 inline-flex items-center gap-2 text-primary hover:underline"
          >
            {asset.name} <span className="text-xs text-muted-foreground">#{asset.id}</span>
          </Link>
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
          {operationTemplateMetadata && (
            <div>
              <p className="text-xs text-muted-foreground">
                {isChinese ? "操作详情" : "Operation Details"}
              </p>
              <OperationTemplateView
                metadata={operationTemplateMetadata}
                locale={locale}
                className="mt-2"
              />
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">
              {isChinese ? "附加信息" : "Metadata"}
            </p>
            {metadataSplit.known.length > 0 && (
              <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                {metadataSplit.known.map((item) => (
                  <div key={item.key}>
                    <dt className="text-xs text-muted-foreground">
                      {isChinese
                        ? metadataSplit.labels[item.key]?.labelZh ?? item.key
                        : metadataSplit.labels[item.key]?.labelEn ?? item.key}
                    </dt>
                    <dd className="text-sm font-medium text-foreground">
                      {item.value || "-"}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {metadataSplit.rest && (
              <pre className="mt-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                {JSON.stringify(metadataSplit.rest, null, 2)}
              </pre>
            )}
            {metadataSplit.known.length === 0 && !metadataSplit.rest && (
              <p className="text-sm text-muted-foreground">
                {isChinese ? "暂无附加信息" : "No metadata"}
              </p>
            )}
          </div>
        </div>
      </section>

      {approval.status === "pending" && (
        <ApprovalActionForm
          approvalId={approval.id}
          locale={locale}
          approverId={approval.approverId}
          applicantId={approval.applicantId}
        />
      )}
    </div>
  );
}

