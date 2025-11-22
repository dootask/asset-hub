export type BorrowRecordStatus = "active" | "returned";

export interface BorrowRecord {
  id: string;
  assetId: string;
  borrowOperationId: string;
  borrower?: string | null;
  plannedReturnDate?: string | null;
  status: BorrowRecordStatus;
  returnOperationId?: string | null;
  returnOperationDate?: string | null;
  overdueNotifiedAt?: string | null;
  externalTodoId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OverdueBorrowRecord extends BorrowRecord {
  assetName: string;
  assetOwner: string;
}


