import { normalizeLocale } from "@/lib/i18n";
import type { ConsumableStatus } from "@/lib/types/consumable";

export type ConsumableOperationType =
  | "purchase"
  | "inbound"
  | "outbound"
  | "reserve"
  | "release"
  | "adjust"
  | "dispose";

export type ConsumableOperationStatus = "pending" | "done" | "cancelled";

export const CONSUMABLE_OPERATION_TYPE_LABELS: Record<
  ConsumableOperationType,
  { en: string; zh: string }
> = {
  purchase: { en: "Purchase", zh: "采购" },
  inbound: { en: "Inbound", zh: "入库" },
  outbound: { en: "Outbound", zh: "出库" },
  reserve: { en: "Reserve", zh: "预留" },
  release: { en: "Release", zh: "释放" },
  adjust: { en: "Adjust", zh: "调整" },
  dispose: { en: "Dispose", zh: "处理" },
};

export const CONSUMABLE_OPERATION_TYPES: {
  value: ConsumableOperationType;
  label: { en: string; zh: string };
}[] = (Object.entries(CONSUMABLE_OPERATION_TYPE_LABELS) as Array<
  [ConsumableOperationType, { en: string; zh: string }]
>).map(([value, label]) => ({
  value,
  label,
}));

export const getConsumableOperationTypeLabel = (
  type: string,
  locale?: string,
): string => {
  const labels =
    CONSUMABLE_OPERATION_TYPE_LABELS[type as ConsumableOperationType];
  return labels ? labels[normalizeLocale(locale)] : type;
};

export interface ConsumableOperation {
  id: string;
  consumableId: string;
  type: ConsumableOperationType;
  description: string;
  actor: string;
  status: ConsumableOperationStatus;
  quantityDelta: number;
  reservedDelta: number;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateConsumableOperationPayload {
  type: ConsumableOperationType;
  actor: string;
  description?: string;
  status?: ConsumableOperationStatus;
  quantityDelta?: number;
  reservedDelta?: number;
  metadata?: Record<string, unknown>;
}

export interface ConsumableOperationAuditEntry extends ConsumableOperation {
  consumableName: string;
  consumableCategory: string;
  consumableStatus: ConsumableStatus;
  keeper?: string | null;
  location?: string | null;
}
