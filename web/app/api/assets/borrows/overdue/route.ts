import { NextResponse } from "next/server";
import { listOverdueBorrowRecords } from "@/lib/repositories/borrow-records";

export async function GET() {
  const records = listOverdueBorrowRecords();
  return NextResponse.json({ data: records });
}


