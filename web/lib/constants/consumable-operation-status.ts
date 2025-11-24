import type { ConsumableOperationStatus } from "@/lib/types/consumable-operation";

export type ConsumableOperationStatusMeta = {
  zh: string;
  en: string;
  variant: "secondary" | "default" | "outline";
};

export const CONSUMABLE_OPERATION_STATUS_LABELS: Record<
  ConsumableOperationStatus,
  ConsumableOperationStatusMeta
> = {
  pending: { zh: "待处理", en: "Pending", variant: "secondary" },
  done: { zh: "已完成", en: "Done", variant: "default" },
  cancelled: { zh: "已取消", en: "Cancelled", variant: "outline" },
};
