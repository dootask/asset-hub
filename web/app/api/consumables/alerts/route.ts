import { NextResponse } from "next/server";
import {
  listConsumableAlerts,
  propagateConsumableAlertResult,
  resolveAlertsForConsumable,
} from "@/lib/repositories/consumable-alerts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam && statusParam.length
      ? statusParam.split(",").map((value) => value.trim())
      : ["open"];

  const data = listConsumableAlerts({
    status: status?.filter(Boolean) as
      | ("open" | "resolved")[]
      | undefined,
  });
  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const consumableId = searchParams.get("consumableId");
  if (!consumableId) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "缺少 consumableId 参数。",
      },
      { status: 400 },
    );
  }
  const resolved = resolveAlertsForConsumable(consumableId);
  await propagateConsumableAlertResult({
    resolved,
  });
  return NextResponse.json({ data: resolved });
}

