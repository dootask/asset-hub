import { NextResponse } from "next/server";
import { getDashboardOverview } from "@/lib/repositories/analytics";

export async function GET() {
  const data = getDashboardOverview();
  return NextResponse.json({ data });
}


