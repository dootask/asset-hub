import { NextResponse } from "next/server";
import { listOverdueBorrowRecords } from "@/lib/repositories/borrow-records";
import { ensureAdminApiAccess } from "@/lib/server/api-guards";
import { sendBorrowOverdueNotifications } from "@/lib/services/borrow-overdue-notifications";

export async function GET() {
  const records = listOverdueBorrowRecords();
  return NextResponse.json({ data: records });
}

export async function POST(request: Request) {
  const forbidden = ensureAdminApiAccess(
    request,
    "只有管理员可以触发逾期借用提醒。",
  );
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const referenceDate = searchParams.get("referenceDate") ?? undefined;

  const result = await sendBorrowOverdueNotifications({
    referenceDate,
  });

  return NextResponse.json({ data: result });
}

