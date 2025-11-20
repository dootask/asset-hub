import { normalizeLocale } from "@/lib/i18n";

export type AssetStatus = "in-use" | "idle" | "maintenance" | "retired";

export const ASSET_STATUSES: AssetStatus[] = [
  "in-use",
  "idle",
  "maintenance",
  "retired",
];

export const ASSET_STATUS_LABELS: Record<
  AssetStatus,
  { en: string; zh: string }
> = {
  "in-use": { en: "In Use", zh: "使用中" },
  idle: { en: "Idle", zh: "闲置" },
  maintenance: { en: "Maintenance", zh: "维护中" },
  retired: { en: "Retired", zh: "已退役" },
};

export const DEFAULT_ASSET_CATEGORIES = [
  "Laptop",
  "Server",
  "Security",
  "Network",
  "Other",
] as const;

export type DefaultAssetCategory = (typeof DEFAULT_ASSET_CATEGORIES)[number];

export const ASSET_CATEGORY_LABELS: Record<
  DefaultAssetCategory,
  { en: string; zh: string }
> = {
  Laptop: { en: "Laptop", zh: "笔记本电脑" },
  Server: { en: "Server", zh: "服务器" },
  Security: { en: "Security", zh: "安全设备" },
  Network: { en: "Network", zh: "网络设备" },
  Other: { en: "Other", zh: "其他" },
};

export const getAssetStatusLabel = (
  status: AssetStatus,
  locale?: string,
): string => {
  const labels = ASSET_STATUS_LABELS[status];
  return labels ? labels[normalizeLocale(locale)] : status;
};

export const getAssetCategoryLabel = (
  category: string,
  locale?: string,
): string => {
  const key = category as DefaultAssetCategory;
  const labels = ASSET_CATEGORY_LABELS[key];
  return labels ? labels[normalizeLocale(locale)] : category;
};

export interface Asset {
  id: string;
  name: string;
  category: string;
  status: AssetStatus;
  owner: string;
  location: string;
  purchaseDate: string; // ISO string
}

export interface CreateAssetPayload {
  name: string;
  category: string;
  status: AssetStatus;
  owner: string;
  location: string;
  purchaseDate: string;
}

