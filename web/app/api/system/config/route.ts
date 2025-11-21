import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { getConsumableStockStats } from "@/lib/repositories/consumables";

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

  const consumableStats = getConsumableStockStats();

  return NextResponse.json({
    data: {
      assets,
      companies,
      roles,
      consumables: consumableStats.total,
      lowStockConsumables:
        consumableStats.lowStock + consumableStats.outOfStock,
    },
  });
}

