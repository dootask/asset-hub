import { normalizeLocale } from "@/lib/i18n";

export type ConsumableStatus =
  | "in-stock"
  | "reserved"
  | "low-stock"
  | "out-of-stock"
  | "archived";

export const CONSUMABLE_STATUSES: ConsumableStatus[] = [
  "in-stock",
  "reserved",
  "low-stock",
  "out-of-stock",
  "archived",
];

export const CONSUMABLE_STATUS_LABELS: Record<
  ConsumableStatus,
  { zh: string; en: string }
> = {
  "in-stock": { zh: "库存充足", en: "In Stock" },
  reserved: { zh: "已预留", en: "Reserved" },
  "low-stock": { zh: "低库存", en: "Low Stock" },
  "out-of-stock": { zh: "缺货", en: "Out of Stock" },
  archived: { zh: "已归档", en: "Archived" },
};

export const getConsumableStatusLabel = (
  status: ConsumableStatus,
  locale?: string,
): string => {
  const labels = CONSUMABLE_STATUS_LABELS[status];
  return labels ? labels[normalizeLocale(locale)] : status;
};

export interface Consumable {
  id: string;
  consumableNo?: string;
  name: string;
  specModel?: string;
  category: string;
  status: ConsumableStatus;
  companyCode?: string;
  quantity: number;
  reservedQuantity: number;
  unit: string;
  keeper: string;
  location: string;
  safetyStock: number;
  purchasePriceCents?: number;
  purchaseCurrency?: string;
  description?: string;
  metadata?: Record<string, unknown> | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
  restoredAt?: string | null;
  restoredBy?: string | null;
}

export interface CreateConsumablePayload {
  consumableNo?: string;
  name: string;
  specModel?: string;
  category: string;
  status: ConsumableStatus;
  companyCode: string;
  quantity: number;
  reservedQuantity?: number;
  unit: string;
  keeper: string;
  location: string;
  safetyStock: number;
  purchasePriceCents?: number | null;
  purchaseCurrency?: string;
  description?: string;
  metadata?: Record<string, unknown> | null;
}

export interface ConsumableCategory {
  id: string;
  code: string;
  labelZh: string;
  labelEn: string;
  consumableNoPrefix?: string | null;
  description?: string | null;
  unit?: string | null;
}

export interface CreateConsumableCategoryPayload {
  code: string;
  labelZh: string;
  labelEn: string;
  consumableNoPrefix?: string | null;
  description?: string;
  unit?: string;
}
