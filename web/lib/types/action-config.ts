export type ActionConfigId =
  | "purchase"
  | "inbound"
  | "receive"
  | "borrow"
  | "return"
  | "maintenance"
  | "dispose"
  | "outbound"
  | "reserve"
  | "release"
  | "adjust"
  | "other";

export type ApproverType = "none" | "user" | "role";

export interface ActionConfig {
  id: ActionConfigId;
  labelZh: string;
  labelEn: string;
  requiresApproval: boolean;
  defaultApproverType: ApproverType;
  defaultApproverRefs: string[];
  allowOverride: boolean;
  metadata: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActionConfigInput {
  requiresApproval: boolean;
  defaultApproverType: ApproverType;
  defaultApproverRefs: string[];
  allowOverride: boolean;
  metadata?: Record<string, unknown> | null;
}


