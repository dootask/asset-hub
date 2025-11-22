import type { AssetOperation } from "@/lib/types/operation";
import { upsertBorrowRecord, markBorrowRecordReturned } from "@/lib/repositories/borrow-records";
import { extractOwnerFromOperationMetadata } from "@/lib/utils/asset-state";
import { extractOperationTemplateMetadata } from "@/lib/utils/operation-template";

function extractPlannedReturnDate(operation: AssetOperation) {
  const templateMetadata = extractOperationTemplateMetadata(
    operation.metadata ?? undefined,
  );
  const raw = templateMetadata?.values?.returnPlan;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function handleBorrowOperationCreated(
  assetId: string,
  operation: AssetOperation,
) {
  upsertBorrowRecord({
    assetId,
    borrowOperationId: operation.id,
    borrower:
      extractOwnerFromOperationMetadata(operation.metadata ?? undefined) ?? null,
    plannedReturnDate: extractPlannedReturnDate(operation),
  });
}

export function handleReturnOperationCreated(
  assetId: string,
  operation: AssetOperation,
) {
  markBorrowRecordReturned(assetId, operation.id);
}


