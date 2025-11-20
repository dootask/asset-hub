import { NextResponse } from "next/server";
import { getDashboardOverview } from "@/lib/repositories/analytics";

const ALLOWED_DAYS = new Set([7, 14, 30]);

function resolveDays(value: string | null) {
  if (!value) return 14;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 14;
  return ALLOWED_DAYS.has(parsed) ? parsed : 14;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = resolveDays(searchParams.get("days"));
  const data = getDashboardOverview({ days });
  return NextResponse.json({ data });
}


