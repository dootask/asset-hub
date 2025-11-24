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
  name: string;
  category: string;
  status: AssetStatus;
  companyCode?: string;
  owner: string;
  location: string;
  purchaseDate: string; // ISO string
}

export interface CreateAssetPayload {
  name: string;
  category: string;
  status: AssetStatus;
  companyCode: string;
  owner: string;
  location: string;
  purchaseDate: string;
}

