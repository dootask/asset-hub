import type { ApprovalType } from "@/lib/types/approval";
import type { AssetStatus } from "@/lib/types/asset";
import type { AssetOperationType } from "@/lib/types/operation";
import type {
  OperationTemplateMetadata,
  OperationTemplateValues,
} from "@/lib/types/operation-template";
import { extractOperationTemplateMetadata } from "@/lib/utils/operation-template";

const OWNER_CANDIDATE_KEYS = ["receiver", "borrower", "returner"];

export function inferAssetStatusFromAction(
  type?: AssetOperationType | ApprovalType | string | null,
): AssetStatus | null {
  switch (type) {
    case "receive":
    case "borrow":
      return "in-use";
    case "return":
    case "inbound":
      return "idle";
    case "maintenance":
      return "maintenance";
    case "dispose":
      return "retired";
    default:
      return null;
  }
}

function extractOwnerFromTemplateValues(
  values?: OperationTemplateValues | null,
) {
  if (!values) return null;
  for (const key of OWNER_CANDIDATE_KEYS) {
    const value = values[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function extractOwnerFromOperationMetadata(
  metadata?: Record<string, unknown> | null,
) {
  if (!metadata) return null;
  const templateMetadata = extractOperationTemplateMetadata(metadata);
  const ownerFromTemplate = extractOwnerFromTemplateValues(
    templateMetadata?.values,
  );
  if (ownerFromTemplate) {
    return ownerFromTemplate;
  }
  for (const key of OWNER_CANDIDATE_KEYS) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function resolveTemplateMetadataFromSources(
  operationMetadata?: Record<string, unknown> | null,
  approvalMetadata?: Record<string, unknown> | null,
): OperationTemplateMetadata | null {
  return (
    extractOperationTemplateMetadata(operationMetadata ?? undefined) ??
    extractOperationTemplateMetadata(approvalMetadata ?? undefined)
  );
}

