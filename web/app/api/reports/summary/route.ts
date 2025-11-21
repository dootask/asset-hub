import { NextResponse } from "next/server";
import {
  getAssetCategoryDistribution,
  getAssetStatusDistribution,
  getApprovalStatusDistribution,
  getApprovalTypeDistribution,
  getOperationSummary,
  getRecentApprovalOutcome,
} from "@/lib/repositories/analytics";

export async function GET() {
  const assetsByStatus = getAssetStatusDistribution();
  const assetsByCategory = getAssetCategoryDistribution(999);
  const approvalsByStatus = getApprovalStatusDistribution();
  const operationsByType = getOperationSummary(30);
  const approvalsByType = getApprovalTypeDistribution();
  const approvalsRecent30d = getRecentApprovalOutcome(30);

  return NextResponse.json({
    data: {
      assetsByStatus,
      assetsByCategory,
      approvalsByStatus,
      approvalsByType,
      approvalsRecent30d,
      operationsByType,
    },
  });
}



