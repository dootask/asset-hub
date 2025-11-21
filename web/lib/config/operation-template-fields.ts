import type { ApprovalType } from "@/lib/types/approval";
import type { AssetOperationType } from "@/lib/types/operation";
import type {
  OperationTemplate,
  OperationTemplateField,
  OperationTemplateFieldWidget,
  OperationTemplateId,
} from "@/lib/types/operation-template";

type RawFieldSpec =
  | string
  | (Partial<Omit<OperationTemplateField, "key" | "widget">> & {
      key?: string;
      widget?: OperationTemplateFieldWidget | string;
    });

const FIELD_LIBRARY: Record<string, OperationTemplateField> = {
  receiver: {
    key: "receiver",
    widget: "text",
    labelZh: "领用人",
    labelEn: "Receiver",
    placeholderZh: "请输入领用人姓名",
    placeholderEn: "Enter recipient name",
    required: true,
  },
  borrower: {
    key: "borrower",
    widget: "text",
    labelZh: "借用人",
    labelEn: "Borrower",
    placeholderZh: "请输入借用人姓名",
    placeholderEn: "Enter borrower name",
    required: true,
  },
  returner: {
    key: "returner",
    widget: "text",
    labelZh: "归还人",
    labelEn: "Returner",
    placeholderZh: "请输入归还人姓名",
    placeholderEn: "Enter returner name",
    required: true,
  },
  purpose: {
    key: "purpose",
    widget: "textarea",
    labelZh: "用途说明",
    labelEn: "Purpose",
    placeholderZh: "描述本次使用或申请的原因",
    placeholderEn: "Describe why this operation is needed",
  },
  notes: {
    key: "notes",
    widget: "textarea",
    labelZh: "备注",
    labelEn: "Notes",
    placeholderZh: "补充额外信息",
    placeholderEn: "Add additional details",
  },
  returnPlan: {
    key: "returnPlan",
    widget: "date",
    labelZh: "计划归还日期",
    labelEn: "Planned Return Date",
  },
  expectedDate: {
    key: "expectedDate",
    widget: "date",
    labelZh: "预计完成日期",
    labelEn: "Expected Date",
  },
  warehouse: {
    key: "warehouse",
    widget: "text",
    labelZh: "仓库 / 地点",
    labelEn: "Warehouse / Location",
    placeholderZh: "输入仓库名称或位置",
    placeholderEn: "Enter warehouse or location",
  },
  vendor: {
    key: "vendor",
    widget: "text",
    labelZh: "供应商 / 执行人",
    labelEn: "Vendor / Provider",
    placeholderZh: "输入供应商或执行人名称",
    placeholderEn: "Enter vendor name",
  },
  budget: {
    key: "budget",
    widget: "number",
    labelZh: "预算金额",
    labelEn: "Budget",
    placeholderZh: "请输入预算金额",
    placeholderEn: "Enter budget amount",
  },
  cost: {
    key: "cost",
    widget: "number",
    labelZh: "费用",
    labelEn: "Cost",
    placeholderZh: "请输入费用金额",
    placeholderEn: "Enter cost amount",
  },
  duration: {
    key: "duration",
    widget: "text",
    labelZh: "借用时长",
    labelEn: "Duration",
    placeholderZh: "例如：14 天",
    placeholderEn: "e.g. 14 days",
  },
  photos: {
    key: "photos",
    widget: "attachments",
    labelZh: "照片 / 附件",
    labelEn: "Photos / Attachments",
    helperZh: "可粘贴图片链接或文件存储地址，多个条目请换行。",
    helperEn: "Paste photo URLs or storage links, one per line.",
  },
  depositAttachment: {
    key: "depositAttachment",
    widget: "attachments",
    labelZh: "押金凭证",
    labelEn: "Deposit Proof",
    helperZh: "可填写存根编号或上传凭证链接。",
    helperEn: "Enter receipt numbers or paste links to deposit proof.",
  },
  report: {
    key: "report",
    widget: "attachments",
    labelZh: "维修报告",
    labelEn: "Maintenance Report",
    helperZh: "可粘贴维修报告链接或编号。",
    helperEn: "Paste maintenance report links or identifiers.",
  },
  evidence: {
    key: "evidence",
    widget: "attachments",
    labelZh: "佐证材料",
    labelEn: "Evidence",
    helperZh: "请提供报废或处理的证据链接。",
    helperEn: "Provide evidence links for the disposal/operation.",
  },
  method: {
    key: "method",
    widget: "text",
    labelZh: "处理方式",
    labelEn: "Disposal Method",
    placeholderZh: "例如：捐赠、拍卖、销毁",
    placeholderEn: "e.g. Donate, Auction, Destroy",
    required: true,
  },
  condition: {
    key: "condition",
    widget: "textarea",
    labelZh: "设备状态",
    labelEn: "Asset Condition",
    placeholderZh: "描述归还或当前状态",
    placeholderEn: "Describe current condition",
  },
};

export const DEFAULT_OPERATION_TEMPLATE_FIELDS: Record<
  OperationTemplateId,
  string[]
> = {
  purchase: ["budget", "vendor", "expectedDate"],
  inbound: ["warehouse", "receiver", "photos"],
  receive: ["receiver", "purpose", "returnPlan"],
  borrow: ["borrower", "duration", "depositAttachment"],
  return: ["condition", "notes"],
  maintenance: ["vendor", "cost", "report"],
  dispose: ["method", "evidence"],
  other: ["notes"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractRawFieldSpecs(
  metadata?: Record<string, unknown> | null,
): RawFieldSpec[] {
  if (!metadata) return [];

  if (Array.isArray(metadata)) {
    return metadata as RawFieldSpec[];
  }

  if (isRecord(metadata) && Array.isArray(metadata.fields)) {
    return metadata.fields as RawFieldSpec[];
  }

  return [];
}

function isWidget(value: unknown): value is OperationTemplateFieldWidget {
  return value === "text" || value === "textarea" || value === "number" || value === "date" || value === "attachments";
}

function normalizeRawField(spec: RawFieldSpec): OperationTemplateField | null {
  if (!spec) return null;

  if (typeof spec === "string") {
    const lib = FIELD_LIBRARY[spec];
    if (lib) {
      return lib;
    }
    return {
      key: spec,
      widget: "text",
      labelZh: spec,
      labelEn: spec,
    };
  }

  const key = spec.key ?? "";
  if (!key.trim()) {
    return null;
  }
  const lib = FIELD_LIBRARY[key];
  const widget = isWidget(spec.widget) ? spec.widget : lib?.widget ?? "text";

  return {
    key,
    widget,
    labelZh: spec.labelZh ?? lib?.labelZh ?? key,
    labelEn: spec.labelEn ?? lib?.labelEn ?? key,
    placeholderZh: spec.placeholderZh ?? lib?.placeholderZh,
    placeholderEn: spec.placeholderEn ?? lib?.placeholderEn,
    helperZh: spec.helperZh ?? lib?.helperZh,
    helperEn: spec.helperEn ?? lib?.helperEn,
    required: spec.required ?? lib?.required ?? false,
  };
}

export function deriveOperationTemplateFields(
  type: OperationTemplateId,
  template?: OperationTemplate | null,
): OperationTemplateField[] {
  const rawFields = extractRawFieldSpecs(template?.metadata);

  const fallbackKeys = DEFAULT_OPERATION_TEMPLATE_FIELDS[type] ?? [];
  const specs = rawFields.length ? rawFields : fallbackKeys;

  const seen = new Set<string>();
  const result: OperationTemplateField[] = [];
  specs.forEach((spec) => {
    const normalized = normalizeRawField(spec);
    if (!normalized) return;
    if (seen.has(normalized.key)) return;
    seen.add(normalized.key);
    result.push(normalized);
  });

  return result;
}

export function normalizeOperationTypeToTemplateType(
  type: AssetOperationType,
): OperationTemplateId {
  if (type === "other") return "other";
  if (type === "dispose") return "dispose";
  if (type === "maintenance") return "maintenance";
  if (type === "borrow") return "borrow";
  if (type === "return") return "return";
  if (type === "receive") return "receive";
  if (type === "inbound") return "inbound";
  if (type === "purchase") return "purchase";
  return "other";
}

export function mapApprovalTypeToTemplateType(
  type: ApprovalType,
): OperationTemplateId {
  switch (type) {
    case "purchase":
      return "purchase";
    case "inbound":
      return "inbound";
    case "receive":
      return "receive";
    case "borrow":
      return "borrow";
    case "return":
      return "return";
    case "dispose":
      return "dispose";
    default:
      return "other";
  }
}

