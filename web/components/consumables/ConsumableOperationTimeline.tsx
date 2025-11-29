"use client";

import Link from "next/link";
import clsx from "clsx";
import ApprovalStatusBadge from "@/components/approvals/ApprovalStatusBadge";
import type { ConsumableOperation } from "@/lib/types/consumable-operation";
import {
  getConsumableOperationTypeLabel,
  type ConsumableOperationType,
} from "@/lib/types/consumable-operation";
import { extractOperationTemplateMetadata } from "@/lib/utils/operation-template";
import OperationTemplateView from "@/components/operations/OperationTemplateView";
import type { ApprovalRequest } from "@/lib/types/approval";

const STATUS_LABELS: Record<
  ConsumableOperation["status"],
  { zh: string; en: string; className: string }
> = {
  pending: {
    zh: "待执行",
    en: "Pending",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
  },
  done: {
    zh: "已完成",
    en: "Done",
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100",
  },
  cancelled: {
    zh: "已取消",
    en: "Cancelled",
    className: "bg-muted text-muted-foreground",
  },
};

const TYPES_USING_QUANTITY: ConsumableOperationType[] = [
  "purchase",
  "inbound",
  "outbound",
  "adjust",
  "dispose",
];
const TYPES_USING_RESERVED: ConsumableOperationType[] = ["reserve", "release"];

type Props = {
  operations: ConsumableOperation[];
  unit: string;
  approvalsByOperation?: Record<string, ApprovalRequest>;
  locale?: string;
};

export default function ConsumableOperationTimeline({
  operations,
  unit,
  approvalsByOperation,
  locale = "en",
}: Props) {
  const isChinese = locale === "zh";

  if (operations.length === 0) {
    return (
      <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
        {isChinese ? "尚无耗材操作记录。" : "No consumable operations yet."}
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {operations.map((operation) => {
        const createdAtLabel = new Date(operation.createdAt).toLocaleString(
          isChinese ? "zh-CN" : "en-US",
        );
        const templateMetadata = extractOperationTemplateMetadata(
          operation.metadata ?? undefined,
        );
        const linkedApproval = approvalsByOperation?.[operation.id];
        const showQuantity = TYPES_USING_QUANTITY.includes(operation.type);
        const showReserved = TYPES_USING_RESERVED.includes(operation.type);
        return (
          <li key={operation.id} className="rounded-2xl border bg-card/60 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {getConsumableOperationTypeLabel(operation.type, locale)}
              </span>
              <span>{createdAtLabel}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
              <span
                className={clsx(
                  "inline-flex rounded-full px-3 py-1",
                  STATUS_LABELS[operation.status].className,
                )}
              >
                {isChinese
                  ? STATUS_LABELS[operation.status].zh
                  : STATUS_LABELS[operation.status].en}
              </span>
              {showQuantity && operation.quantityDelta !== 0 && (
                <span className="inline-flex rounded-full bg-muted px-3 py-1 text-muted-foreground">
                  {operation.quantityDelta > 0 ? "+" : ""}
                  {operation.quantityDelta} {unit}
                </span>
              )}
              {showReserved && operation.reservedDelta !== 0 && (
                <span className="inline-flex rounded-full bg-muted px-3 py-1 text-muted-foreground">
                  {operation.reservedDelta > 0 ? "+" : ""}
                  {operation.reservedDelta}{" "}
                  {isChinese ? "预留" : "Reserved"}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              {operation.description || (isChinese ? "无描述" : "No description")}
            </p>
            <p className="text-xs text-muted-foreground">{operation.actor}</p>
            {linkedApproval && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <Link
                  href={`/${locale}/approvals/${linkedApproval.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {isChinese
                    ? `关联审批：${linkedApproval.id}`
                    : `Approval ${linkedApproval.id}`}
                </Link>
                <ApprovalStatusBadge
                  status={linkedApproval.status}
                  locale={locale}
                />
              </div>
            )}
            {templateMetadata && (
              <div className="mt-3">
                <OperationTemplateView
                  metadata={templateMetadata}
                  locale={locale}
                  variant="inline"
                  className="bg-transparent p-0"
                  title={isChinese ? "填写明细" : "Submitted Details"}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
