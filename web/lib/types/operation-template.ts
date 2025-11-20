export type OperationTemplateId =
  | "purchase"
  | "inbound"
  | "receive"
  | "borrow"
  | "return"
  | "maintenance"
  | "dispose"
  | "other";

export interface OperationTemplate {
  id: string;
  type: OperationTemplateId;
  labelZh: string;
  labelEn: string;
  descriptionZh?: string | null;
  descriptionEn?: string | null;
  requireAttachment: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface OperationTemplateInput {
  descriptionZh?: string | null;
  descriptionEn?: string | null;
  requireAttachment?: boolean;
  metadata?: Record<string, unknown> | null;
}



