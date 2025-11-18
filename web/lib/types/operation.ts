export type AssetOperationType =
  | "purchase"
  | "inbound"
  | "receive"
  | "maintenance"
  | "other";

export const OPERATION_TYPES: { value: AssetOperationType; label: string }[] = [
  { value: "purchase", label: "采购" },
  { value: "inbound", label: "入库" },
  { value: "receive", label: "领用" },
  { value: "maintenance", label: "维护" },
  { value: "other", label: "其他" },
];

export interface AssetOperation {
  id: string;
  assetId: string;
  type: AssetOperationType;
  description: string;
  actor: string;
  createdAt: string;
}

export interface CreateAssetOperationPayload {
  type: AssetOperationType;
  description: string;
  actor: string;
}

