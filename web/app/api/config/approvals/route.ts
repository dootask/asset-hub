import { NextResponse } from "next/server";
import { listActionConfigs } from "@/lib/repositories/action-configs";
import { extractUserFromRequest } from "@/lib/utils/request-user";
import { isAdminUser } from "@/lib/utils/permissions";

export async function GET(request: Request) {
  // Allow all authenticated users to read approval configs to know the rules
  const configs = listActionConfigs();
  return NextResponse.json({ data: configs });
}
