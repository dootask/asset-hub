export type AssetOperationType =
  | "purchase"
  | "inbound"
  | "receive"
  | "borrow"
  | "return"
  | "maintenance"
  | "dispose"
  | "other";

export type AssetOperationStatus = "pending" | "done" | "cancelled";

type SupportedLocale = "en" | "zh";

const resolveLocale = (locale?: string): SupportedLocale =>
  locale === "zh" ? "zh" : "en";

export const OPERATION_TYPE_LABELS: Record<
  AssetOperationType,
  { en: string; zh: string }
> = {
  purchase: { en: "Purchase", zh: "采购" },
  inbound: { en: "Inbound", zh: "入库" },
  receive: { en: "Receive", zh: "领用" },
  borrow: { en: "Borrow", zh: "借用" },
  return: { en: "Return", zh: "归还" },
  maintenance: { en: "Maintenance", zh: "维护" },
  dispose: { en: "Dispose", zh: "报废" },
  other: { en: "Other", zh: "其他" },
};

export const OPERATION_TYPES: {
  value: AssetOperationType;
  label: { en: string; zh: string };
}[] = (Object.entries(OPERATION_TYPE_LABELS) as Array<
  [AssetOperationType, { en: string; zh: string }]
>).map(([value, label]) => ({
  value,
  label,
}));

export const getOperationTypeLabel = (
  type: string,
  locale?: string,
): string => {
  const labels = OPERATION_TYPE_LABELS[type as AssetOperationType];
  return labels ? labels[resolveLocale(locale)] : type;
};

export interface AssetOperation {
  id: string;
  assetId: string;
  type: AssetOperationType;
  description: string;
  actor: string;
  status: AssetOperationStatus;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateAssetOperationPayload {
  type: AssetOperationType;
  description: string;
  actor: string;
  status?: AssetOperationStatus;
  metadata?: Record<string, unknown>;
}

