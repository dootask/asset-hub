import type { ApprovalType } from "@/lib/types/approval";

export const CONSUMABLE_ONLY_APPROVAL_TYPES = [
  "outbound",
  "reserve",
  "release",
  "adjust",
] as const satisfies readonly ApprovalType[];

export const CONSUMABLE_SUPPORTED_APPROVAL_TYPES = [
  ...CONSUMABLE_ONLY_APPROVAL_TYPES,
  "purchase",
  "inbound",
  "dispose",
] as const satisfies readonly ApprovalType[];

const CONSUMABLE_ONLY_APPROVAL_TYPE_SET = new Set<ApprovalType>(
  CONSUMABLE_ONLY_APPROVAL_TYPES,
);
const CONSUMABLE_SUPPORTED_APPROVAL_TYPE_SET = new Set<ApprovalType>(
  CONSUMABLE_SUPPORTED_APPROVAL_TYPES,
);

export function isConsumableOnlyApprovalType(type: ApprovalType): boolean {
  return CONSUMABLE_ONLY_APPROVAL_TYPE_SET.has(type);
}

export function isConsumableApprovalType(type: ApprovalType): boolean {
  return CONSUMABLE_SUPPORTED_APPROVAL_TYPE_SET.has(type);
}

