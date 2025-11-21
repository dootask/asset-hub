import { NextResponse } from "next/server";
import {
  queryConsumableOperations,
} from "@/lib/repositories/consumable-operations";
import { buildConsumableOperationQuery } from "@/lib/utils/consumable-operation-query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = buildConsumableOperationQuery(searchParams);
  const result = queryConsumableOperations(query);

  return NextResponse.json({
    data: result.items,
    meta: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    },
    summary: result.summary,
  });
}

