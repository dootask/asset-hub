"use client";

import type { AssetOperation } from "@/lib/types/operation";
import clsx from "clsx";

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

export default function OperationTimeline({ operations, locale }: Props) {
  const isChinese = locale === "zh";

  if (operations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {isChinese ? "暂无操作记录" : "No operations yet."}
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {operations.map((operation) => (
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
        </li>
      ))}
    </ul>
  );
}

