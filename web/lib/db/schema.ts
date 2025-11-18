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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
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
  },
  {
    id: "OP-002",
    asset_id: "AST-001",
    type: "inbound",
    description: "资产入库并贴上二维码标签",
    actor: "仓库管理员",
  },
  {
    id: "OP-003",
    asset_id: "AST-002",
    type: "maintenance",
    description: "例行巡检，更新 BIOS 固件",
    actor: "基础架构组",
  },
];

