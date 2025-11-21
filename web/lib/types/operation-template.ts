export type OperationTemplateId =
  | "purchase"
  | "inbound"
  | "receive"
  | "borrow"
  | "return"
  | "maintenance"
  | "dispose"
  | "other";

export type OperationTemplateFieldWidget =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "attachments";

export interface OperationTemplateField {
  key: string;
  widget: OperationTemplateFieldWidget;
  labelZh: string;
  labelEn: string;
  placeholderZh?: string;
  placeholderEn?: string;
  helperZh?: string;
  helperEn?: string;
  required?: boolean;
}

export type OperationTemplateFieldValue =
  | string
  | number
  | string[]
  | null
  | undefined;

export type OperationTemplateValues = Record<
  string,
  OperationTemplateFieldValue
>;

export interface OperationTemplateSnapshotField {
  key: string;
  labelZh: string;
  labelEn: string;
  widget: OperationTemplateFieldWidget;
}

export interface OperationTemplateSnapshot {
  id?: string;
  type: OperationTemplateId;
  labelZh: string;
  labelEn: string;
  requireAttachment: boolean;
  fields: OperationTemplateSnapshotField[];
}

export interface OperationTemplateMetadata {
  snapshot?: OperationTemplateSnapshot;
  values?: OperationTemplateValues;
}

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
