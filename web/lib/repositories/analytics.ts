import { getDb } from "@/lib/db/client";

export interface DistributionItem {
  label: string;
  count: number;
}

export interface TrendItem {
  date: string;
  count: number;
}

export interface DashboardOverview {
  assetsByStatus: DistributionItem[];
  assetsByCategory: DistributionItem[];
  approvalsByStatus: DistributionItem[];
  approvalsTrend: TrendItem[];
  operationsByType: DistributionItem[];
  pendingApprovals: number;
}

export function getAssetStatusDistribution(): DistributionItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT status as label, COUNT(1) as count
       FROM assets
       GROUP BY status`,
    )
    .all() as { label: string; count: number }[];
  return rows;
}

export function getAssetCategoryDistribution(limit = 5): DistributionItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT category as label, COUNT(1) as count
       FROM assets
       GROUP BY category
       ORDER BY count DESC
       LIMIT ?`,
    )
    .all(limit) as { label: string; count: number }[];
  return rows;
}

export function getApprovalStatusDistribution(): DistributionItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT status as label, COUNT(1) as count
       FROM asset_approval_requests
       GROUP BY status`,
    )
    .all() as { label: string; count: number }[];
  return rows;
}

export function getApprovalTrend(days = 14): TrendItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(1) as count
       FROM asset_approval_requests
       WHERE date(created_at) >= date('now', ?)
       GROUP BY date
       ORDER BY date ASC`,
    )
    .all(`-${days - 1} days`) as { date: string; count: number }[];

  return rows;
}

export function getOperationSummary(days = 30): DistributionItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT type as label, COUNT(1) as count
       FROM asset_operations
       WHERE date(created_at) >= date('now', ?)
       GROUP BY type`,
    )
    .all(`-${days} days`) as { label: string; count: number }[];
  return rows;
}

export function getPendingApprovalCount() {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(1) as count
       FROM asset_approval_requests
       WHERE status = 'pending'`,
    )
    .get() as { count: number };
  return row.count;
}

export function getDashboardOverview(): DashboardOverview {
  return {
    assetsByStatus: getAssetStatusDistribution(),
    assetsByCategory: getAssetCategoryDistribution(),
    approvalsByStatus: getApprovalStatusDistribution(),
    approvalsTrend: getApprovalTrend(),
    operationsByType: getOperationSummary(),
    pendingApprovals: getPendingApprovalCount(),
  };
}


