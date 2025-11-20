import { getDb } from "@/lib/db/client";
import {
  ActionConfig,
  ActionConfigId,
  ActionConfigInput,
  ApproverType,
} from "@/lib/types/action-config";

type ActionConfigRow = {
  id: string;
  label_zh: string;
  label_en: string;
  requires_approval: number;
  default_approver_type: string;
  default_approver_refs: string | null;
  allow_override: number;
  metadata: string | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_ACTION_CONFIGS: Record<ActionConfigId, ActionConfig> = {
  purchase: {
    id: "purchase",
    labelZh: "采购",
    labelEn: "Purchase",
    requiresApproval: true,
    defaultApproverType: "none",
    defaultApproverRefs: [],
    allowOverride: true,
    metadata: null,
  },
  inbound: {
    id: "inbound",
    labelZh: "入库",
    labelEn: "Inbound",
    requiresApproval: true,
    defaultApproverType: "none",
    defaultApproverRefs: [],
    allowOverride: true,
    metadata: null,
  },
  receive: {
    id: "receive",
    labelZh: "领用",
    labelEn: "Receive",
    requiresApproval: true,
    defaultApproverType: "none",
    defaultApproverRefs: [],
    allowOverride: true,
    metadata: null,
  },
  borrow: {
    id: "borrow",
    labelZh: "借用",
    labelEn: "Borrow",
    requiresApproval: true,
    defaultApproverType: "none",
    defaultApproverRefs: [],
    allowOverride: true,
    metadata: null,
  },
  return: {
    id: "return",
    labelZh: "归还",
    labelEn: "Return",
    requiresApproval: true,
    defaultApproverType: "none",
    defaultApproverRefs: [],
    allowOverride: true,
    metadata: null,
  },
  maintenance: {
    id: "maintenance",
    labelZh: "维护",
    labelEn: "Maintenance",
    requiresApproval: true,
    defaultApproverType: "none",
    defaultApproverRefs: [],
    allowOverride: true,
    metadata: null,
  },
  dispose: {
    id: "dispose",
    labelZh: "报废",
    labelEn: "Dispose",
    requiresApproval: true,
    defaultApproverType: "none",
    defaultApproverRefs: [],
    allowOverride: true,
    metadata: null,
  },
  other: {
    id: "other",
    labelZh: "其他",
    labelEn: "Other",
    requiresApproval: true,
    defaultApproverType: "none",
    defaultApproverRefs: [],
    allowOverride: true,
    metadata: null,
  },
};

function mapRow(row: ActionConfigRow): ActionConfig {
  return {
    id: row.id as ActionConfigId,
    labelZh: row.label_zh,
    labelEn: row.label_en,
    requiresApproval: Boolean(row.requires_approval),
    defaultApproverType: (row.default_approver_type as ApproverType) ?? "none",
    defaultApproverRefs: row.default_approver_refs
      ? (JSON.parse(row.default_approver_refs) ?? [])
      : [],
    allowOverride: Boolean(row.allow_override),
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listActionConfigs(): ActionConfig[] {
  const db = getDb();
  const rows = db
    .prepare<[], ActionConfigRow>("SELECT * FROM asset_action_configs")
    .all();

  const mapped = rows.map(mapRow);
  const byId = new Map<ActionConfigId, ActionConfig>();
  for (const item of mapped) {
    byId.set(item.id, item);
  }

  return (Object.keys(DEFAULT_ACTION_CONFIGS) as ActionConfigId[]).map((id) =>
    byId.get(id) ?? DEFAULT_ACTION_CONFIGS[id],
  );
}

export function getActionConfig(id: ActionConfigId): ActionConfig {
  const db = getDb();
  const row = db
    .prepare<[ActionConfigId], ActionConfigRow>(
      "SELECT * FROM asset_action_configs WHERE id = ? LIMIT 1",
    )
    .get(id);

  if (row) {
    return mapRow(row);
  }

  return DEFAULT_ACTION_CONFIGS[id];
}

export function upsertActionConfig(
  id: ActionConfigId,
  payload: ActionConfigInput,
) {
  const db = getDb();
  const defaults = DEFAULT_ACTION_CONFIGS[id];

  const labelZh = defaults.labelZh;
  const labelEn = defaults.labelEn;

  db.prepare(
    `INSERT INTO asset_action_configs (
        id,
        label_zh,
        label_en,
        requires_approval,
        default_approver_type,
        default_approver_refs,
        allow_override,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        @id, @label_zh, @label_en, @requires_approval, @default_approver_type,
        @default_approver_refs, @allow_override, @metadata, datetime('now'), datetime('now')
      )
      ON CONFLICT(id) DO UPDATE SET
        requires_approval = excluded.requires_approval,
        default_approver_type = excluded.default_approver_type,
        default_approver_refs = excluded.default_approver_refs,
        allow_override = excluded.allow_override,
        metadata = excluded.metadata,
        label_zh = excluded.label_zh,
        label_en = excluded.label_en,
        updated_at = datetime('now')`,
  ).run({
    id,
    label_zh: labelZh,
    label_en: labelEn,
    requires_approval: payload.requiresApproval ? 1 : 0,
    default_approver_type: payload.defaultApproverType,
    default_approver_refs: JSON.stringify(payload.defaultApproverRefs ?? []),
    allow_override: payload.allowOverride ? 1 : 0,
    metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
  });

  return getActionConfig(id);
}

