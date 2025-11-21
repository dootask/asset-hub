export type ReportDataSource = "assets" | "approvals";

export interface ReportView {
  id: string;
  name: string;
  dataSource: ReportDataSource;
  fields: string[];
  filters?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateReportViewPayload {
  name: string;
  dataSource: ReportDataSource;
  fields: string[];
  filters?: Record<string, unknown>;
}

export interface ReportExecutionResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

