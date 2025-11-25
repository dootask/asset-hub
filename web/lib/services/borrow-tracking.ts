import type { AssetOperation } from "@/lib/types/operation";
import { upsertBorrowRecord, markBorrowRecordReturned } from "@/lib/repositories/borrow-records";
import { extractOwnerFromOperationMetadata } from "@/lib/utils/asset-state";
import { extractOperationTemplateMetadata } from "@/lib/utils/operation-template";

export type BorrowOperationContext = {
  borrowerToken?: string | null;
  serverOrigin?: string | null;
};

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
  context?: BorrowOperationContext,
) {
  upsertBorrowRecord({
    assetId,
    borrowOperationId: operation.id,
    borrower:
      extractOwnerFromOperationMetadata(operation.metadata ?? undefined) ?? null,
    plannedReturnDate: extractPlannedReturnDate(operation),
    borrowerToken: context?.borrowerToken ?? null,
    serverOrigin: context?.serverOrigin ?? null,
  });
}

export function handleReturnOperationCreated(
  assetId: string,
  operation: AssetOperation,
) {
  markBorrowRecordReturned(assetId, operation.id);
}

