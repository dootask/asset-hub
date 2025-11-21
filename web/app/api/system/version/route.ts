import { NextResponse } from "next/server";
import { getSystemVersionInfo } from "@/lib/repositories/system-version";

export async function GET() {
  return NextResponse.json({
    data: getSystemVersionInfo(),
  });
}

