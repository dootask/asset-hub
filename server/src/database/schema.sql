-- 资产管理系统数据库 Schema

-- 公司表
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  parent_id INTEGER,
  level INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  contact_person TEXT,
  contact_phone TEXT,
  address TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_companies_parent_id ON companies(parent_id);
CREATE INDEX idx_companies_status ON companies(status);

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  company_id INTEGER NOT NULL,
  parent_id INTEGER,
  manager_id INTEGER,
  sort INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE CASCADE,
  UNIQUE(company_id, code)
);

CREATE INDEX idx_departments_company_id ON departments(company_id);
CREATE INDEX idx_departments_parent_id ON departments(parent_id);
CREATE INDEX idx_departments_manager_id ON departments(manager_id);

-- 用户表（同步自 DooTask）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dootask_user_id INTEGER UNIQUE,
  username TEXT NOT NULL UNIQUE,
  realname TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar TEXT,
  company_id INTEGER,
  department_id INTEGER,
  position TEXT,
  employee_number TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'locked')),
  last_login_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_status ON users(status);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- 资产分类表
CREATE TABLE IF NOT EXISTS asset_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  parent_id INTEGER,
  icon TEXT,
  description TEXT,
  custom_fields TEXT, -- JSON 格式存储自定义字段配置
  depreciation_rate REAL, -- 折旧率
  depreciation_years INTEGER, -- 折旧年限
  sort INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES asset_categories(id) ON DELETE CASCADE
);

CREATE INDEX idx_asset_categories_parent_id ON asset_categories(parent_id);
CREATE INDEX idx_asset_categories_status ON asset_categories(status);

-- 资产主表
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle', 'in_use', 'maintaining', 'borrowing', 'scrapped', 'lost')),
  company_id INTEGER NOT NULL,
  department_id INTEGER,
  user_id INTEGER, -- 当前使用人
  location TEXT,
  purchase_date DATE,
  purchase_price REAL,
  current_value REAL,
  supplier TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  warranty_end_date DATE,
  description TEXT,
  custom_fields TEXT, -- JSON 格式存储自定义字段值
  images TEXT, -- JSON 格式存储图片 URL 数组
  qr_code TEXT, -- 二维码
  rfid_tag TEXT, -- RFID 标签
  created_by INTEGER NOT NULL,
  updated_by INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES asset_categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_assets_category_id ON assets(category_id);
CREATE INDEX idx_assets_company_id ON assets(company_id);
CREATE INDEX idx_assets_department_id ON assets(department_id);
CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_code ON assets(code);

-- 资产操作记录表
CREATE TABLE IF NOT EXISTS asset_operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('purchase', 'stock_in', 'requisition', 'borrow', 'return', 'transfer', 'maintain', 'scrap', 'recycle', 'lost')),
  operator_id INTEGER NOT NULL,
  from_user_id INTEGER,
  to_user_id INTEGER,
  from_department_id INTEGER,
  to_department_id INTEGER,
  from_location TEXT,
  to_location TEXT,
  quantity INTEGER DEFAULT 1,
  amount REAL,
  reason TEXT,
  attachments TEXT, -- JSON 格式存储附件 URL 数组
  approval_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')),
  operated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id) REFERENCES users(id),
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (from_department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (to_department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (approval_id) REFERENCES approvals(id) ON DELETE SET NULL
);

CREATE INDEX idx_asset_operations_asset_id ON asset_operations(asset_id);
CREATE INDEX idx_asset_operations_type ON asset_operations(type);
CREATE INDEX idx_asset_operations_operator_id ON asset_operations(operator_id);
CREATE INDEX idx_asset_operations_status ON asset_operations(status);
CREATE INDEX idx_asset_operations_operated_at ON asset_operations(operated_at);

-- 审批表
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  applicant_id INTEGER NOT NULL,
  approver_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewing', 'approved', 'rejected', 'cancelled')),
  content TEXT NOT NULL, -- JSON 格式存储审批内容
  attachments TEXT, -- JSON 格式存储附件 URL 数组
  reason TEXT, -- 拒绝原因或备注
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
  approved_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (applicant_id) REFERENCES users(id),
  FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_approvals_applicant_id ON approvals(applicant_id);
CREATE INDEX idx_approvals_approver_id ON approvals(approver_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_type ON approvals(type);
CREATE INDEX idx_approvals_created_at ON approvals(created_at);

-- 审批日志表
CREATE TABLE IF NOT EXISTS approval_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  approval_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('submit', 'approve', 'reject', 'cancel', 'comment')),
  comment TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (approval_id) REFERENCES approvals(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_approval_logs_approval_id ON approval_logs(approval_id);

-- 耗材分类表
CREATE TABLE IF NOT EXISTS consumable_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  parent_id INTEGER,
  description TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES consumable_categories(id) ON DELETE CASCADE
);

CREATE INDEX idx_consumable_categories_parent_id ON consumable_categories(parent_id);

-- 耗材表
CREATE TABLE IF NOT EXISTS consumables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL,
  unit TEXT NOT NULL, -- 计量单位
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0, -- 最小库存预警
  max_stock INTEGER, -- 最大库存
  price REAL,
  supplier TEXT,
  location TEXT,
  specification TEXT, -- 规格
  description TEXT,
  images TEXT, -- JSON 格式存储图片 URL 数组
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_by INTEGER NOT NULL,
  updated_by INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES consumable_categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_consumables_category_id ON consumables(category_id);
CREATE INDEX idx_consumables_status ON consumables(status);
CREATE INDEX idx_consumables_stock ON consumables(stock);

-- 耗材操作记录表
CREATE TABLE IF NOT EXISTS consumable_operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consumable_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('purchase', 'stock_in', 'requisition', 'return', 'loss', 'expired')),
  operator_id INTEGER NOT NULL,
  user_id INTEGER, -- 领用人
  department_id INTEGER,
  quantity INTEGER NOT NULL,
  unit_price REAL,
  total_amount REAL,
  reason TEXT,
  attachments TEXT, -- JSON 格式存储附件 URL 数组
  approval_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')),
  operated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consumable_id) REFERENCES consumables(id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id) REFERENCES users(id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (approval_id) REFERENCES approvals(id) ON DELETE SET NULL
);

CREATE INDEX idx_consumable_operations_consumable_id ON consumable_operations(consumable_id);
CREATE INDEX idx_consumable_operations_type ON consumable_operations(type);
CREATE INDEX idx_consumable_operations_operator_id ON consumable_operations(operator_id);
CREATE INDEX idx_consumable_operations_operated_at ON consumable_operations(operated_at);

-- 盘点任务表
CREATE TABLE IF NOT EXISTS inventory_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('asset', 'consumable')),
  category_ids TEXT, -- JSON 格式存储分类 ID 数组
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  assignee_ids TEXT NOT NULL, -- JSON 格式存储负责人 ID 数组
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  result TEXT, -- JSON 格式存储盘点结果
  created_by INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_inventory_tasks_type ON inventory_tasks(type);
CREATE INDEX idx_inventory_tasks_status ON inventory_tasks(status);
CREATE INDEX idx_inventory_tasks_start_date ON inventory_tasks(start_date);

-- 盘点明细表
CREATE TABLE IF NOT EXISTS inventory_task_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK(item_type IN ('asset', 'consumable')),
  item_id INTEGER NOT NULL,
  expected_quantity INTEGER NOT NULL,
  actual_quantity INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'normal', 'surplus', 'loss')),
  remark TEXT,
  checked_by INTEGER,
  checked_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES inventory_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (checked_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_inventory_task_items_task_id ON inventory_task_items(task_id);
CREATE INDEX idx_inventory_task_items_item_type_id ON inventory_task_items(item_type, item_id);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  link TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  read_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- 系统设置表
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  type TEXT NOT NULL DEFAULT 'string' CHECK(type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  is_public INTEGER NOT NULL DEFAULT 0, -- 是否公开（前端可见）
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id INTEGER,
  content TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_module ON operation_logs(module);
CREATE INDEX idx_operation_logs_created_at ON operation_logs(created_at);

-- 版本信息表
CREATE TABLE IF NOT EXISTS version_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL,
  license_type TEXT NOT NULL DEFAULT 'free' CHECK(license_type IN ('free', 'basic', 'professional', 'enterprise')),
  max_users INTEGER,
  expire_date DATE,
  license_key TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
