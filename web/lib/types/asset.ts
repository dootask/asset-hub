import { normalizeLocale } from "@/lib/i18n";

export type AssetStatus = "pending" | "in-use" | "idle" | "maintenance" | "retired";

export const ASSET_STATUSES: AssetStatus[] = [
  "pending",
  "in-use",
  "idle",
  "maintenance",
  "retired",
];

export const ASSET_STATUS_LABELS: Record<
  AssetStatus,
  { en: string; zh: string }
> = {
  pending: { en: "Pending", zh: "待入库" },
  "in-use": { en: "In Use", zh: "使用中" },
  idle: { en: "Idle", zh: "闲置" },
  maintenance: { en: "Maintenance", zh: "维护中" },
  retired: { en: "Retired", zh: "已退役" },
};

export const getAssetStatusLabel = (
  status: AssetStatus,
  locale?: string,
): string => {
  const labels = ASSET_STATUS_LABELS[status];
  return labels ? labels[normalizeLocale(locale)] : status;
};

export interface Asset {
  id: string;
  assetNo?: string;
  name: string;
  specModel?: string;
  category: string;
  status: AssetStatus;
  companyCode?: string;
  owner: string;
  location: string;
  purchaseDate: string; // ISO string
  expiresAt?: string; // YYYY-MM-DD
  note?: string;
  purchasePriceCents?: number;
  purchaseCurrency?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
  restoredAt?: string | null;
  restoredBy?: string | null;
}

export interface CreateAssetPayload {
  assetNo?: string;
  name: string;
  specModel?: string;
  category: string;
  status: AssetStatus;
  companyCode: string;
  owner: string;
  location: string;
  purchaseDate: string;
  expiresAt?: string;
  note?: string;
  purchasePriceCents?: number | null;
  purchaseCurrency?: string;
}
