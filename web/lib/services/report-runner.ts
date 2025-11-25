import { listAssets } from "@/lib/repositories/assets";
import { listApprovalRequests } from "@/lib/repositories/approvals";
import { ASSET_STATUSES, type AssetStatus } from "@/lib/types/asset";
import {
  APPROVAL_STATUSES,
  APPROVAL_TYPES,
  type ApprovalStatus,
  type ApprovalType,
} from "@/lib/types/approval";
import type {
  ReportExecutionResult,
  ReportView,
} from "@/lib/types/report";

const ASSET_FIELDS = [
  "id",
  "name",
  "category",
  "status",
  "owner",
  "location",
  "purchaseDate",
] as const;

const APPROVAL_FIELDS = [
  "id",
  "title",
  "type",
  "status",
  "applicantName",
  "approverName",
  "updatedAt",
] as const;

const APPROVAL_STATUS_VALUES = APPROVAL_STATUSES.map((item) => item.value);
const APPROVAL_TYPE_VALUES = APPROVAL_TYPES.map((item) => item.value);

function pickRow(row: unknown, fields: string[]) {
  if (typeof row !== "object" || row === null) return {};
  const record = row as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  fields.forEach((field) => {
    if (field in record) {
      result[field] = record[field];
    }
  });
  return result;
}

export function runReportView(view: ReportView): ReportExecutionResult {
  if (view.dataSource === "assets") {
    const filters = view.filters ?? {};
    const result = listAssets({
      page: 1,
      pageSize: 200,
      search:
        typeof filters.search === "string" && filters.search.trim()
          ? filters.search.trim()
          : undefined,
      category:
        typeof filters.category === "string" && filters.category.trim()
          ? filters.category.trim()
          : undefined,
      status: Array.isArray(filters.status)
        ? (filters.status as string[]).filter(
            (status): status is AssetStatus =>
              ASSET_STATUSES.includes(status as AssetStatus),
          )
        : undefined,
    });
    const fields =
      view.fields.length > 0
        ? view.fields.filter((field) =>
            ASSET_FIELDS.includes(field as (typeof ASSET_FIELDS)[number]),
          )
        : ASSET_FIELDS.slice();
    const rows = result.items.map((asset) => pickRow(asset, fields));
    return { columns: fields, rows };
  }

  const filters = view.filters ?? {};
  const approvals = listApprovalRequests({
    status: Array.isArray(filters.status)
      ? (filters.status as string[]).filter(
          (status): status is ApprovalStatus =>
            APPROVAL_STATUS_VALUES.includes(status as ApprovalStatus),
        )
      : undefined,
    type: Array.isArray(filters.type)
      ? (filters.type as string[]).filter(
          (type): type is ApprovalType =>
            APPROVAL_TYPE_VALUES.includes(type as ApprovalType),
        )
      : undefined,
    applicantId:
      typeof filters.applicantId === "string" && filters.applicantId.trim()
        ? filters.applicantId.trim()
        : undefined,
    approverId:
      typeof filters.approverId === "string" && filters.approverId.trim()
        ? filters.approverId.trim()
        : undefined,
    page: 1,
    pageSize: 200,
  });
  const fields =
    view.fields.length > 0
      ? view.fields.filter((field) =>
          APPROVAL_FIELDS.includes(field as (typeof APPROVAL_FIELDS)[number]),
        )
      : APPROVAL_FIELDS.slice();
  const rows = approvals.data.map((approval) => pickRow(approval, fields));
  return { columns: fields, rows };
}
