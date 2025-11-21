export type ApprovalType =
  | "purchase"
  | "inbound"
  | "receive"
  | "borrow"
  | "return"
  | "dispose"
  | "outbound"
  | "reserve"
  | "release"
  | "adjust"
  | "generic";

export const APPROVAL_TYPES: {
  value: ApprovalType;
  labelZh: string;
  labelEn: string;
}[] = [
  { value: "purchase", labelZh: "采购审批", labelEn: "Purchase" },
  { value: "inbound", labelZh: "入库确认", labelEn: "Inbound" },
  { value: "receive", labelZh: "领用审批", labelEn: "Receive" },
  { value: "borrow", labelZh: "借用审批", labelEn: "Borrow" },
  { value: "return", labelZh: "归还确认", labelEn: "Return" },
  { value: "dispose", labelZh: "报废处理", labelEn: "Dispose" },
  { value: "outbound", labelZh: "耗材出库", labelEn: "Outbound" },
  { value: "reserve", labelZh: "耗材预留", labelEn: "Reserve" },
  { value: "release", labelZh: "预留释放", labelEn: "Release" },
  { value: "adjust", labelZh: "库存调整", labelEn: "Adjust" },
  { value: "generic", labelZh: "其它审批", labelEn: "General" },
];

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export const APPROVAL_STATUSES: { value: ApprovalStatus; label: string }[] = [
  { value: "pending", label: "待审批" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已驳回" },
  { value: "cancelled", label: "已撤销" },
];

export interface ApprovalRequest {
  id: string;
  assetId?: string | null;
  consumableId?: string | null;
  operationId?: string | null;
  consumableOperationId?: string | null;
  type: ApprovalType;
  status: ApprovalStatus;
  title: string;
  reason?: string | null;
  applicantId: string;
  applicantName?: string | null;
  approverId?: string | null;
  approverName?: string | null;
  result?: string | null;
  externalTodoId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface CreateApprovalRequestPayload {
  assetId?: string;
  consumableId?: string;
  operationId?: string;
  consumableOperationId?: string;
  type: ApprovalType;
  title: string;
  reason?: string;
  applicant: {
    id: string;
    name?: string;
  };
  approver?: {
    id?: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;
}

export type ApprovalAction = "approve" | "reject" | "cancel";

export interface ApprovalActionPayload {
  action: ApprovalAction;
  comment?: string;
  actor: {
    id: string;
    name?: string;
  };
}

export interface ApprovalListFilters {
  status?: ApprovalStatus[];
  type?: ApprovalType[];
  applicantId?: string;
  approverId?: string;
  assetId?: string;
  consumableId?: string;
  operationId?: string;
  consumableOperationId?: string;
  role?: "my-requests" | "my-tasks";
  userId?: string;
  page?: number;
  pageSize?: number;
}


