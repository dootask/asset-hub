"use client";

import type { AssetOperation } from "@/lib/types/operation";

const TYPE_LABELS: Record<
  AssetOperation["type"],
  { zh: string; en: string }
> = {
  purchase: { zh: "采购", en: "Purchase" },
  inbound: { zh: "入库", en: "Inbound" },
  receive: { zh: "领用", en: "Receive" },
  maintenance: { zh: "维护", en: "Maintenance" },
  other: { zh: "其它", en: "Other" },
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
          <p className="mt-2 text-sm font-medium text-foreground">
            {operation.description || "-"}
          </p>
          <p className="text-xs text-muted-foreground">{operation.actor}</p>
        </li>
      ))}
    </ul>
  );
}

