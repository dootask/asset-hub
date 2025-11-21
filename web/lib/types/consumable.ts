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
  name: string;
  category: string;
  status: ConsumableStatus;
  quantity: number;
  reservedQuantity: number;
  unit: string;
  keeper: string;
  location: string;
  safetyStock: number;
  description?: string;
  metadata?: Record<string, unknown> | null;
}

export interface CreateConsumablePayload {
  name: string;
  category: string;
  status: ConsumableStatus;
  quantity: number;
  reservedQuantity?: number;
  unit: string;
  keeper: string;
  location: string;
  safetyStock: number;
  description?: string;
  metadata?: Record<string, unknown> | null;
}

export interface ConsumableCategory {
  id: string;
  code: string;
  labelZh: string;
  labelEn: string;
  description?: string | null;
  unit?: string | null;
}

export interface CreateConsumableCategoryPayload {
  code: string;
  labelZh: string;
  labelEn: string;
  description?: string;
  unit?: string;
}

