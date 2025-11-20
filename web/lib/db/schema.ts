export const CREATE_TABLES = {
  assets: `
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      owner TEXT NOT NULL,
      location TEXT NOT NULL,
      purchase_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `,
  companies: `
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `,
  roles: `
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT ('system'),
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `,
  operations: `
    CREATE TABLE IF NOT EXISTS asset_operations (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      actor TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT ('done'),
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
    );
  `,
  approvalRequests: `
    CREATE TABLE IF NOT EXISTS asset_approval_requests (
      id TEXT PRIMARY KEY,
      asset_id TEXT,
      operation_id TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT ('pending'),
      title TEXT NOT NULL,
      reason TEXT,
      applicant_id TEXT NOT NULL,
      applicant_name TEXT,
      approver_id TEXT,
      approver_name TEXT,
      result TEXT,
      external_todo_id TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE SET NULL,
      FOREIGN KEY(operation_id) REFERENCES asset_operations(id) ON DELETE SET NULL
    );
  `,
  actionConfigs: `
    CREATE TABLE IF NOT EXISTS asset_action_configs (
      id TEXT PRIMARY KEY,
      label_zh TEXT NOT NULL,
      label_en TEXT NOT NULL,
      requires_approval INTEGER NOT NULL DEFAULT 0,
      default_approver_type TEXT NOT NULL DEFAULT ('none'),
      default_approver_refs TEXT,
      allow_override INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `,
};

export const seedAssets = [
  {
    id: "AST-001",
    name: "MacBook Pro 16”",
    category: "Laptop",
    status: "in-use",
    owner: "王小明",
    location: "上海总部",
    purchaseDate: "2024-01-15",
  },
  {
    id: "AST-002",
    name: "Dell PowerEdge R760",
    category: "Server",
    status: "idle",
    owner: "基础架构组",
    location: "上海机房",
    purchaseDate: "2023-11-03",
  },
  {
    id: "AST-003",
    name: "海康威视摄像头",
    category: "Security",
    status: "maintenance",
    owner: "行政部",
    location: "北京办公区",
    purchaseDate: "2022-09-20",
  },
];

export const seedCompanies = [
  {
    id: "COMP-001",
    name: "星云集团",
    code: "NEBULA",
    description: "总部位于上海的集团公司",
  },
  {
    id: "COMP-002",
    name: "远航科技",
    code: "VOYAGER",
    description: "深圳研发中心",
  },
];

export const seedRoles = [
  {
    id: "ROLE-ADMIN",
    name: "超级管理员",
    scope: "system",
    description: "拥有全部资产与配置权限",
  },
  {
    id: "ROLE-ASSET-MANAGER",
    name: "资产管理员",
    scope: "asset",
    description: "负责资产新增、入库与盘点",
  },
];

export const seedOperations = [
  {
    id: "OP-001",
    asset_id: "AST-001",
    type: "purchase",
    description: "完成采购审批并录入系统",
    actor: "王小明",
    status: "done",
  },
  {
    id: "OP-002",
    asset_id: "AST-001",
    type: "inbound",
    description: "资产入库并贴上二维码标签",
    actor: "仓库管理员",
    status: "done",
  },
  {
    id: "OP-003",
    asset_id: "AST-002",
    type: "maintenance",
    description: "例行巡检，更新 BIOS 固件",
    actor: "基础架构组",
    status: "done",
  },
];

export const seedApprovalRequests = [
  {
    id: "APR-001",
    asset_id: "AST-001",
    operation_id: "OP-001",
    type: "purchase",
    status: "approved",
    title: "采购 MacBook Pro 16”",
    reason: "新成员入职需要开发设备",
    applicant_id: "user-asset-001",
    applicant_name: "王小明",
    approver_id: "ROLE-ADMIN",
    approver_name: "超级管理员",
    result: "同意采购并已完成下单",
    external_todo_id: null,
    metadata: JSON.stringify({ amount: 18999, currency: "CNY" }),
    completed_at: "2024-01-10T10:00:00.000Z",
  },
  {
    id: "APR-002",
    asset_id: "AST-001",
    operation_id: "OP-002",
    type: "inbound",
    status: "pending",
    title: "MacBook Pro 入库确认",
    reason: "资产到货，需要仓库确认入库信息",
    applicant_id: "user-warehouse-001",
    applicant_name: "仓库管理员",
    approver_id: "ROLE-ASSET-MANAGER",
    approver_name: "资产管理员",
    result: null,
    external_todo_id: null,
    metadata: JSON.stringify({ photosRequired: true }),
    completed_at: null,
  },
];

export const seedActionConfigs = [
  {
    id: "purchase",
    label_zh: "采购",
    label_en: "Purchase",
    requires_approval: 1,
    default_approver_type: "none",
    default_approver_refs: JSON.stringify([]),
    allow_override: 1,
    metadata: null,
  },
  {
    id: "inbound",
    label_zh: "入库",
    label_en: "Inbound",
    requires_approval: 1,
    default_approver_type: "none",
    default_approver_refs: JSON.stringify([]),
    allow_override: 1,
    metadata: null,
  },
  {
    id: "receive",
    label_zh: "领用",
    label_en: "Receive",
    requires_approval: 1,
    default_approver_type: "none",
    default_approver_refs: JSON.stringify([]),
    allow_override: 1,
    metadata: null,
  },
  {
    id: "borrow",
    label_zh: "借用",
    label_en: "Borrow",
    requires_approval: 1,
    default_approver_type: "none",
    default_approver_refs: JSON.stringify([]),
    allow_override: 1,
    metadata: null,
  },
  {
    id: "return",
    label_zh: "归还",
    label_en: "Return",
    requires_approval: 1,
    default_approver_type: "none",
    default_approver_refs: JSON.stringify([]),
    allow_override: 1,
    metadata: null,
  },
  {
    id: "maintenance",
    label_zh: "维护",
    label_en: "Maintenance",
    requires_approval: 1,
    default_approver_type: "none",
    default_approver_refs: JSON.stringify([]),
    allow_override: 1,
    metadata: null,
  },
  {
    id: "dispose",
    label_zh: "报废",
    label_en: "Dispose",
    requires_approval: 1,
    default_approver_type: "none",
    default_approver_refs: JSON.stringify([]),
    allow_override: 1,
    metadata: null,
  },
  {
    id: "other",
    label_zh: "其他",
    label_en: "Other",
    requires_approval: 1,
    default_approver_type: "none",
    default_approver_refs: JSON.stringify([]),
    allow_override: 1,
    metadata: null,
  },
];

