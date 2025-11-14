import { getDatabase } from './connection.js'
import { runMigrations } from './migrate.js'

interface SeedData {
  companies: any[]
  departments: any[]
  users: any[]
  roles: any[]
  permissions: any[]
  assetCategories: any[]
  consumableCategories: any[]
  systemSettings: any[]
}

const seedData: SeedData = {
  companies: [
    {
      name: '总公司',
      code: 'HQ',
      level: 1,
      sort: 0,
      status: 'active',
    },
  ],
  
  departments: [
    { name: '技术部', code: 'IT', company_id: 1, sort: 0 },
    { name: '行政部', code: 'ADMIN', company_id: 1, sort: 1 },
    { name: '财务部', code: 'FINANCE', company_id: 1, sort: 2 },
  ],
  
  users: [
    {
      username: 'admin',
      realname: '系统管理员',
      email: 'admin@example.com',
      company_id: 1,
      department_id: 1,
      status: 'active',
    },
  ],
  
  roles: [
    {
      name: '超级管理员',
      code: 'admin',
      description: '拥有所有权限',
      is_system: 1,
      status: 'active',
    },
    {
      name: '资产管理员',
      code: 'asset_admin',
      description: '管理资产相关功能',
      is_system: 1,
      status: 'active',
    },
    {
      name: '耗材管理员',
      code: 'consumable_admin',
      description: '管理耗材相关功能',
      is_system: 1,
      status: 'active',
    },
    {
      name: '审批人',
      code: 'approver',
      description: '审批资产和耗材申请',
      is_system: 1,
      status: 'active',
    },
    {
      name: '普通用户',
      code: 'user',
      description: '查看和申请资产耗材',
      is_system: 1,
      status: 'active',
    },
  ],
  
  permissions: [
    // 资产管理权限
    { name: '查看资产', code: 'asset:view', module: 'asset' },
    { name: '创建资产', code: 'asset:create', module: 'asset' },
    { name: '编辑资产', code: 'asset:edit', module: 'asset' },
    { name: '删除资产', code: 'asset:delete', module: 'asset' },
    { name: '导入资产', code: 'asset:import', module: 'asset' },
    { name: '导出资产', code: 'asset:export', module: 'asset' },
    
    // 耗材管理权限
    { name: '查看耗材', code: 'consumable:view', module: 'consumable' },
    { name: '创建耗材', code: 'consumable:create', module: 'consumable' },
    { name: '编辑耗材', code: 'consumable:edit', module: 'consumable' },
    { name: '删除耗材', code: 'consumable:delete', module: 'consumable' },
    
    // 审批权限
    { name: '查看审批', code: 'approval:view', module: 'approval' },
    { name: '提交审批', code: 'approval:submit', module: 'approval' },
    { name: '处理审批', code: 'approval:handle', module: 'approval' },
    
    // 报表权限
    { name: '查看报表', code: 'report:view', module: 'report' },
    { name: '导出报表', code: 'report:export', module: 'report' },
    
    // 系统管理权限
    { name: '用户管理', code: 'system:user', module: 'system' },
    { name: '角色管理', code: 'system:role', module: 'system' },
    { name: '公司管理', code: 'system:company', module: 'system' },
    { name: '系统设置', code: 'system:settings', module: 'system' },
  ],
  
  assetCategories: [
    {
      name: '电子设备',
      code: 'ELECTRONICS',
      description: '电脑、手机等电子设备',
      depreciation_rate: 0.20,
      depreciation_years: 5,
      sort: 0,
    },
    {
      name: '办公家具',
      code: 'FURNITURE',
      description: '办公桌椅、柜子等',
      depreciation_rate: 0.10,
      depreciation_years: 10,
      sort: 1,
    },
    {
      name: '办公用品',
      code: 'SUPPLIES',
      description: '文具、打印机等',
      depreciation_rate: 0.15,
      depreciation_years: 7,
      sort: 2,
    },
  ],
  
  consumableCategories: [
    {
      name: '办公耗材',
      code: 'OFFICE',
      description: '纸张、墨盒等',
      sort: 0,
    },
    {
      name: '清洁用品',
      code: 'CLEANING',
      description: '清洁剂、垃圾袋等',
      sort: 1,
    },
  ],
  
  systemSettings: [
    {
      key: 'system_name',
      value: '资产管理系统',
      type: 'string',
      description: '系统名称',
      is_public: 1,
    },
    {
      key: 'approval_enabled',
      value: 'true',
      type: 'boolean',
      description: '是否启用审批流程',
      is_public: 0,
    },
    {
      key: 'auto_generate_code',
      value: 'true',
      type: 'boolean',
      description: '是否自动生成资产编号',
      is_public: 0,
    },
    {
      key: 'asset_code_prefix',
      value: 'AST',
      type: 'string',
      description: '资产编号前缀',
      is_public: 0,
    },
    {
      key: 'consumable_code_prefix',
      value: 'CON',
      type: 'string',
      description: '耗材编号前缀',
      is_public: 0,
    },
  ],
}

export function seedDatabase(): void {
  const db = getDatabase()
  
  console.log('🌱 Seeding database...')
  
  try {
    db.transaction(() => {
      // 清空现有数据（仅用于开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️  Clearing existing data...')
      }
      
      // 插入公司数据
      const insertCompany = db.prepare(`
        INSERT INTO companies (name, code, level, sort, status)
        VALUES (?, ?, ?, ?, ?)
      `)
      for (const company of seedData.companies) {
        insertCompany.run(company.name, company.code, company.level, company.sort, company.status)
      }
      
      // 插入部门数据
      const insertDepartment = db.prepare(`
        INSERT INTO departments (name, code, company_id, sort)
        VALUES (?, ?, ?, ?)
      `)
      for (const dept of seedData.departments) {
        insertDepartment.run(dept.name, dept.code, dept.company_id, dept.sort)
      }
      
      // 插入用户数据
      const insertUser = db.prepare(`
        INSERT INTO users (username, realname, email, company_id, department_id, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const user of seedData.users) {
        insertUser.run(user.username, user.realname, user.email, user.company_id, user.department_id, user.status)
      }
      
      // 插入角色数据
      const insertRole = db.prepare(`
        INSERT INTO roles (name, code, description, is_system, status)
        VALUES (?, ?, ?, ?, ?)
      `)
      for (const role of seedData.roles) {
        insertRole.run(role.name, role.code, role.description, role.is_system, role.status)
      }
      
      // 插入权限数据
      const insertPermission = db.prepare(`
        INSERT INTO permissions (name, code, module)
        VALUES (?, ?, ?)
      `)
      for (const permission of seedData.permissions) {
        insertPermission.run(permission.name, permission.code, permission.module)
      }
      
      // 为超级管理员分配所有权限
      const permissions = db.prepare('SELECT id FROM permissions').all() as { id: number }[]
      const insertRolePermission = db.prepare(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (?, ?)
      `)
      for (const permission of permissions) {
        insertRolePermission.run(1, permission.id) // role_id 1 是超级管理员
      }
      
      // 为管理员用户分配超级管理员角色
      db.prepare(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES (?, ?)
      `).run(1, 1) // user_id 1, role_id 1
      
      // 插入资产分类数据
      const insertAssetCategory = db.prepare(`
        INSERT INTO asset_categories (name, code, description, depreciation_rate, depreciation_years, sort)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const category of seedData.assetCategories) {
        insertAssetCategory.run(
          category.name,
          category.code,
          category.description,
          category.depreciation_rate,
          category.depreciation_years,
          category.sort
        )
      }
      
      // 插入耗材分类数据
      const insertConsumableCategory = db.prepare(`
        INSERT INTO consumable_categories (name, code, description, sort)
        VALUES (?, ?, ?, ?)
      `)
      for (const category of seedData.consumableCategories) {
        insertConsumableCategory.run(category.name, category.code, category.description, category.sort)
      }
      
      // 插入系统设置数据
      const insertSystemSetting = db.prepare(`
        INSERT INTO system_settings (key, value, type, description, is_public)
        VALUES (?, ?, ?, ?, ?)
      `)
      for (const setting of seedData.systemSettings) {
        insertSystemSetting.run(setting.key, setting.value, setting.type, setting.description, setting.is_public)
      }
      
      // 插入版本信息
      db.prepare(`
        INSERT INTO version_info (version, license_type, max_users)
        VALUES (?, ?, ?)
      `).run('1.0.0', 'free', 10)
      
    })()
    
    console.log('✅ Database seeded successfully')
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    throw error
  }
}

// 如果直接运行此脚本，先运行迁移再执行种子数据
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
  seedDatabase()
  process.exit(0)
}
