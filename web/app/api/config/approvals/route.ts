import { NextResponse } from "next/server";
import { listActionConfigs } from "@/lib/repositories/action-configs";

export async function GET() {
  const configs = listActionConfigs();
  return NextResponse.json({ data: configs });
}


