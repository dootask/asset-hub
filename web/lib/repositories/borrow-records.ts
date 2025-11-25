import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import type {
  BorrowRecord,
  BorrowRecordStatus,
  OverdueBorrowRecord,
} from "@/lib/types/borrow-record";

type BorrowRecordRow = {
  id: string;
  asset_id: string;
  borrow_operation_id: string;
  borrower: string | null;
  borrower_token: string | null;
  server_origin: string | null;
  planned_return_date: string | null;
  status: BorrowRecordStatus;
  return_operation_id: string | null;
  return_operation_date: string | null;
  overdue_notified_at: string | null;
  external_todo_id: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: BorrowRecordRow): BorrowRecord {
  return {
    id: row.id,
    assetId: row.asset_id,
    borrowOperationId: row.borrow_operation_id,
    borrower: row.borrower,
    borrowerToken: row.borrower_token,
    serverOrigin: row.server_origin,
    plannedReturnDate: row.planned_return_date,
    status: row.status,
    returnOperationId: row.return_operation_id,
    returnOperationDate: row.return_operation_date,
    overdueNotifiedAt: row.overdue_notified_at,
    externalTodoId: row.external_todo_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getBorrowRecordById(id: string): BorrowRecord | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM asset_borrow_records WHERE id = ?`)
    .get(id) as BorrowRecordRow | undefined;
  return row ? mapRow(row) : null;
}

export function upsertBorrowRecord(payload: {
  assetId: string;
  borrowOperationId: string;
  borrower?: string | null;
  borrowerToken?: string | null;
  serverOrigin?: string | null;
  plannedReturnDate?: string | null;
}) {
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT id FROM asset_borrow_records WHERE borrow_operation_id = @operationId`,
    )
    .get({ operationId: payload.borrowOperationId }) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE asset_borrow_records
       SET borrower = COALESCE(@borrower, borrower),
           planned_return_date = COALESCE(@plannedReturnDate, planned_return_date),
           borrower_token = COALESCE(@borrowerToken, borrower_token),
           server_origin = COALESCE(@serverOrigin, server_origin),
           updated_at = datetime('now')
       WHERE id = @id`,
    ).run({
      id: existing.id,
      borrower: payload.borrower ?? null,
      borrowerToken: payload.borrowerToken ?? null,
      serverOrigin: payload.serverOrigin ?? null,
      plannedReturnDate: payload.plannedReturnDate ?? null,
    });
    return getBorrowRecordById(existing.id);
  }

  const id = `BOR-${randomUUID().slice(0, 8).toUpperCase()}`;
  db.prepare(
    `INSERT INTO asset_borrow_records (
        id,
        asset_id,
        borrow_operation_id,
        borrower,
        borrower_token,
        server_origin,
        planned_return_date,
        status,
        created_at,
        updated_at
      ) VALUES (
        @id,
        @assetId,
        @borrowOperationId,
        @borrower,
        @borrowerToken,
        @serverOrigin,
        @plannedReturnDate,
        'active',
        datetime('now'),
        datetime('now')
      )`,
  ).run({
    id,
    assetId: payload.assetId,
    borrowOperationId: payload.borrowOperationId,
    borrower: payload.borrower ?? null,
    borrowerToken: payload.borrowerToken ?? null,
    serverOrigin: payload.serverOrigin ?? null,
    plannedReturnDate: payload.plannedReturnDate ?? null,
  });

  return getBorrowRecordById(id);
}

export function markBorrowRecordReturned(
  assetId: string,
  returnOperationId: string,
) {
  const db = getDb();
  const record = db
    .prepare(
      `SELECT id FROM asset_borrow_records
       WHERE asset_id = @assetId
         AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get({ assetId }) as { id: string } | undefined;

  if (!record) {
    return null;
  }

  db.prepare(
    `UPDATE asset_borrow_records
     SET status = 'returned',
         return_operation_id = @returnOperationId,
         return_operation_date = datetime('now'),
         updated_at = datetime('now')
     WHERE id = @id`,
  ).run({
    id: record.id,
    returnOperationId,
  });

  return getBorrowRecordById(record.id);
}

export function markBorrowRecordOverdueNotified(id: string) {
  const db = getDb();
  db.prepare(
    `UPDATE asset_borrow_records
     SET overdue_notified_at = datetime('now'),
         updated_at = datetime('now')
     WHERE id = @id`,
  ).run({ id });
}

export function listOverdueBorrowRecords(referenceDate?: string) {
  const db = getDb();
  const targetDate =
    referenceDate ??
    new Date().toISOString().slice(0, 10); /* YYYY-MM-DD for SQLite date() */

  const rows = db
    .prepare(
      `SELECT abr.*, assets.name as asset_name, assets.owner as asset_owner
       FROM asset_borrow_records abr
       JOIN assets ON assets.id = abr.asset_id
       WHERE abr.status = 'active'
         AND abr.planned_return_date IS NOT NULL
         AND date(abr.planned_return_date) < date(@referenceDate)
       ORDER BY abr.planned_return_date ASC, abr.created_at ASC`,
    )
    .all({ referenceDate: targetDate }) as (BorrowRecordRow & {
      asset_name: string;
      asset_owner: string;
    })[];

  return rows.map((row) => ({
    ...mapRow(row),
    assetName: row.asset_name,
    assetOwner: row.asset_owner,
    borrowerToken: row.borrower_token,
    serverOrigin: row.server_origin,
  })) as OverdueBorrowRecord[];
}
