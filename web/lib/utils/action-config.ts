import type { ActionConfigId } from "@/lib/types/action-config";
import type { ApprovalType } from "@/lib/types/approval";
import type { AssetOperationType } from "@/lib/types/operation";

export function approvalTypeToActionConfigId(type: ApprovalType): ActionConfigId {
  if (type === "generic") {
    return "other";
  }
  return (type as ActionConfigId) ?? "other";
}

export function operationTypeToActionConfigId(
  type: AssetOperationType | undefined,
): ActionConfigId {
  if (!type) {
    return "other";
  }
  return (type as ActionConfigId) ?? "other";
}


