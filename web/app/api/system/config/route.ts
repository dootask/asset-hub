import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

export async function GET() {
  const db = getDb();

  const { assets } = db
    .prepare(`SELECT COUNT(1) as assets FROM assets`)
    .get() as { assets: number };

  const { companies } = db
    .prepare(`SELECT COUNT(1) as companies FROM companies`)
    .get() as { companies: number };

  const { roles } = db
    .prepare(`SELECT COUNT(1) as roles FROM roles`)
    .get() as { roles: number };

  return NextResponse.json({
    data: {
      assets,
      companies,
      roles,
    },
  });
}

