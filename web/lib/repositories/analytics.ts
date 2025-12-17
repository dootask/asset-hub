import { getDb } from "@/lib/db/client";

export interface DistributionItem {
  label: string;
  count: number;
}

export interface TrendItem {
  date: string;
  count: number;
}

export interface AssetStats {
  total: number;
  inUse: number;
  idle: number;
  maintenance: number;
  retired: number;
  pendingApprovals: number;
}

export interface DashboardOverviewOptions {
  days?: number;
}

export interface DashboardOverview {
  stats: AssetStats;
  assetsByStatus: DistributionItem[];
  assetsByCategory: DistributionItem[];
  approvalsByStatus: DistributionItem[];
  approvalsTrend: TrendItem[];
  operationsByType: DistributionItem[];
  operationsTrend: TrendItem[];
  pendingApprovals: number;
}

function normalizeDays(value?: number, fallback = 14) {
  const allowed = [7, 14, 30];
  if (!value || Number.isNaN(value)) {
    return fallback;
  }
  return allowed.includes(value) ? value : fallback;
}

export function getAssetStats(): AssetStats {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        COUNT(1) as total,
        SUM(CASE WHEN status = 'in-use' THEN 1 ELSE 0 END) as in_use,
        SUM(CASE WHEN status = 'idle' THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN status = 'retired' THEN 1 ELSE 0 END) as retired
       FROM assets`,
    )
    .get() as {
      total: number;
      in_use: number;
      idle: number;
      maintenance: number;
      retired: number;
    };
  const pendingApprovals = getPendingApprovalCount();
  return {
    total: row?.total ?? 0,
    inUse: row?.in_use ?? 0,
    idle: row?.idle ?? 0,
    maintenance: row?.maintenance ?? 0,
    retired: row?.retired ?? 0,
    pendingApprovals,
  };
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

export function getApprovalTypeDistribution(): DistributionItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT type as label, COUNT(1) as count
       FROM asset_approval_requests
       GROUP BY type`,
    )
    .all() as { label: string; count: number }[];
  return rows;
}

export function getRecentApprovalOutcome(days = 30): DistributionItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT status as label, COUNT(1) as count
       FROM asset_approval_requests
       WHERE date(created_at) >= date('now', ?)
       GROUP BY status`,
    )
    .all(`-${days} days`) as { label: string; count: number }[];
  return rows;
}

export function getApprovalTrend(days = 14): TrendItem[] {
  const db = getDb();
  const normalized = normalizeDays(days);
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(1) as count
       FROM asset_approval_requests
       WHERE date(created_at) >= date('now', ?)
       GROUP BY date
       ORDER BY date ASC`,
    )
    .all(`-${normalized - 1} days`) as { date: string; count: number }[];

  return rows;
}

export function getOperationSummary(days = 30): DistributionItem[] {
  const db = getDb();
  const normalized = normalizeDays(days, 30);
  const rows = db
    .prepare(
      `SELECT type as label, COUNT(1) as count
       FROM asset_operations
       WHERE date(created_at) >= date('now', ?)
       GROUP BY type`,
    )
    .all(`-${normalized} days`) as { label: string; count: number }[];
  return rows;
}

export function getConsumableStatusDistribution(): DistributionItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT status as label, COUNT(1) as count
       FROM consumables
       GROUP BY status`,
    )
    .all() as { label: string; count: number }[];
  return rows;
}

export function getConsumableCategoryDistribution(limit = 5): DistributionItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT category as label, COUNT(1) as count
       FROM consumables
       GROUP BY category
       ORDER BY count DESC
       LIMIT ?`,
    )
    .all(limit) as { label: string; count: number }[];
  return rows;
}

export function getConsumableOperationSummary(days = 30): DistributionItem[] {
  const db = getDb();
  const normalized = normalizeDays(days, 30);
  const rows = db
    .prepare(
      `SELECT type as label, COUNT(1) as count
       FROM consumable_operations
       WHERE date(created_at) >= date('now', ?)
       GROUP BY type`,
    )
    .all(`-${normalized} days`) as { label: string; count: number }[];
  return rows;
}

export function getOperationTrend(days = 14): TrendItem[] {
  const db = getDb();
  const normalized = normalizeDays(days);
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(1) as count
       FROM asset_operations
       WHERE date(created_at) >= date('now', ?)
       GROUP BY date
       ORDER BY date ASC`,
    )
    .all(`-${normalized - 1} days`) as { date: string; count: number }[];
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

export function getDashboardOverview(
  options?: DashboardOverviewOptions,
): DashboardOverview {
  const days = normalizeDays(options?.days);
  const stats = getAssetStats();
  return {
    stats,
    assetsByStatus: getAssetStatusDistribution(),
    assetsByCategory: getAssetCategoryDistribution(),
    approvalsByStatus: getApprovalStatusDistribution(),
    approvalsTrend: getApprovalTrend(days),
    operationsByType: getOperationSummary(days),
    operationsTrend: getOperationTrend(days),
    pendingApprovals: stats.pendingApprovals,
  };
}

