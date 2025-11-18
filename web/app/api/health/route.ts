import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "asset-hub",
    timestamp: new Date().toISOString(),
  });
}

