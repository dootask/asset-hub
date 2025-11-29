"use client";

import type { AssetOperation } from "@/lib/types/operation";
import clsx from "clsx";
import OperationTemplateView from "@/components/operations/OperationTemplateView";
import { extractOperationTemplateMetadata } from "@/lib/utils/operation-template";
import type {
  OperationTemplateFieldValue,
  OperationTemplateMetadata,
} from "@/lib/types/operation-template";

const TYPE_LABELS: Record<
  AssetOperation["type"],
  { zh: string; en: string }
> = {
  purchase: { zh: "采购", en: "Purchase" },
  inbound: { zh: "入库", en: "Inbound" },
  receive: { zh: "领用", en: "Receive" },
  borrow: { zh: "借用", en: "Borrow" },
  return: { zh: "归还", en: "Return" },
  maintenance: { zh: "维护", en: "Maintenance" },
  dispose: { zh: "报废", en: "Dispose" },
  other: { zh: "其它", en: "Other" },
};

const STATUS_LABELS: Record<
  AssetOperation["status"],
  { zh: string; en: string; className: string }
> = {
  pending: {
    zh: "进行中",
    en: "Pending",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  },
  done: {
    zh: "已完成",
    en: "Done",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  },
  cancelled: {
    zh: "已取消",
    en: "Cancelled",
    className: "bg-muted text-muted-foreground",
  },
};

type Props = {
  operations: AssetOperation[];
  locale?: string;
};

function collectExtraValues(
  metadata: AssetOperation["metadata"],
): Record<string, OperationTemplateFieldValue> {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }
  const extras: Record<string, OperationTemplateFieldValue> = {};

  const deltas = (metadata as Record<string, unknown>).deltas;
  if (deltas && typeof deltas === "object") {
    const q = (deltas as Record<string, unknown>).quantityDelta;
    const r = (deltas as Record<string, unknown>).reservedDelta;
    const unit = (deltas as Record<string, unknown>).unit;
    if (typeof q === "number" && Number.isFinite(q)) {
      extras.quantityDelta = q;
    }
    if (typeof r === "number" && Number.isFinite(r)) {
      extras.reservedDelta = r;
    }
    if (typeof unit === "string" && unit.trim()) {
      extras.unit = unit;
    }
  }

  (["amount", "currency", "initiatedFrom", "reason"] as const).forEach(
    (key) => {
      const value = (metadata as Record<string, unknown>)[key];
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        value === null
      ) {
        extras[key] = value;
      }
    },
  );

  return extras;
}

export default function OperationTimeline({ operations, locale }: Props) {
  const isChinese = locale === "zh";

  if (operations.length === 0) {
    return (
      <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
        {isChinese ? "暂无操作记录。" : "No operations yet."}
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {operations.map((operation) => {
        const templateMetadata = extractOperationTemplateMetadata(
          operation.metadata ?? undefined,
        );
        const extraValues = collectExtraValues(operation.metadata);
        const mergedMetadata: OperationTemplateMetadata | null =
          templateMetadata || Object.keys(extraValues).length
            ? {
                snapshot: templateMetadata?.snapshot,
                values: {
                  ...(templateMetadata?.values ?? {}),
                  ...extraValues,
                },
              }
            : null;
        return (
          <li key={operation.id} className="rounded-2xl border bg-card/60 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isChinese
                  ? TYPE_LABELS[operation.type].zh
                  : TYPE_LABELS[operation.type].en}
              </span>
              <span>{new Date(operation.createdAt).toLocaleString()}</span>
            </div>
            <span
              className={clsx(
                "mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium",
                STATUS_LABELS[operation.status].className,
              )}
            >
              {isChinese
                ? STATUS_LABELS[operation.status].zh
                : STATUS_LABELS[operation.status].en}
            </span>
            <p className="mt-2 text-sm font-medium text-foreground">
              {operation.description || "-"}
            </p>
            <p className="text-xs text-muted-foreground">{operation.actor}</p>
            {mergedMetadata && (
              <div className="mt-3">
                <OperationTemplateView
                  metadata={mergedMetadata}
                  locale={locale}
                  variant="inline"
                  className="bg-transparent p-0"
                  title={isChinese ? "操作详情" : "Operation Details"}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
