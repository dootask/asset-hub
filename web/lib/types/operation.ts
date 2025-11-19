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

export const OPERATION_TYPES: { value: AssetOperationType; label: string }[] = [
  { value: "purchase", label: "采购" },
  { value: "inbound", label: "入库" },
  { value: "receive", label: "领用" },
  { value: "borrow", label: "借用" },
  { value: "return", label: "归还" },
  { value: "maintenance", label: "维护" },
  { value: "dispose", label: "报废" },
  { value: "other", label: "其他" },
];

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

