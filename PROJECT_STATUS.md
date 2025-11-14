# 资产管理插件开发进度

## 项目概述

基于 DooTask 的企业资产与耗材管理系统，采用 React + Koa + SQLite 技术栈。

## 已完成功能

### ✅ 迭代 0: 环境搭建与 PoC（已完成）

1. **项目初始化**
   - ✅ 创建完整的项目目录结构
   - ✅ 配置 dootask-plugin 插件层（config.yml, docker-compose.yml, nginx.conf）
   - ✅ 配置 Docker 多阶段构建
   - ✅ 配置 GitHub Actions 自动发布流程

2. **前端工程**
   - ✅ 初始化 Vite + React + TypeScript 项目
   - ✅ 配置 Tailwind CSS 和 shadcn/ui 组件库
   - ✅ 创建路由系统和布局组件
   - ✅ 实现主题适配（light/dark mode）
   - ✅ 创建基础 UI 组件（Button, Card, etc.）

3. **后端工程**
   - ✅ 初始化 Koa + TypeScript 项目
   - ✅ 配置中间件（router, body, cors, helmet, etc.）
   - ✅ 集成 better-sqlite3 数据库
   - ✅ 创建数据库迁移脚本和种子数据

4. **数据库设计**
   - ✅ 完整的数据库 Schema（15+ 表）
   - ✅ 核心表：公司、部门、用户、角色权限
   - ✅ 资产相关表：分类、资产、操作记录
   - ✅ 审批流程表：审批、审批日志
   - ✅ 耗材相关表：分类、耗材、操作记录
   - ✅ 盘点任务表
   - ✅ 通知和系统设置表

### ✅ 迭代 1: 核心资产管理 Beta（已完成）

1. **系统管理基础**
   - ✅ 公司管理：CRUD API + 层级结构支持
   - ✅ 人员管理：CRUD API + DooTask 同步接口
   - ✅ 角色管理：CRUD API + 权限分配

2. **资产基础功能**
   - ✅ 资产分类管理：树形结构 + CRUD API
   - ✅ 资产列表：分页查询 + 多条件筛选
   - ✅ 资产详情：完整信息展示
   - ✅ 资产新增/编辑：动态表单 + 字段校验
   - ✅ 资产统计：按状态、分类、公司、部门统计

3. **资产操作流程**
   - ✅ 采购申请：提交 → 审批流程
   - ✅ 入库流程：创建资产 + 上传图片
   - ✅ 领用申请：提交 → 审批 → 资产分配

4. **审批中心**
   - ✅ 审批提交、查询、处理接口
   - ✅ 审批状态管理（pending, reviewing, approved, rejected）
   - ✅ 审批日志记录
   - ✅ 待审批数量统计

5. **首页仪表板**
   - ✅ 资产概览统计（按状态统计）
   - ✅ 按分类/公司/部门分布统计
   - ✅ 最近操作记录
   - ✅ 待办事项列表
   - ✅ 资产趋势分析（按月统计）
   - ✅ 耗材库存概览

## 当前进度

**已完成**: 10 / 24 个主要任务 (42%)

## 待实现功能

### 🔄 迭代 2: 流程拓展与盘点

1. **资产操作流程扩展**
   - ⏳ 借用/归还流程
   - ⏳ 派发流程
   - ⏳ 维修流程
   - ⏳ 报废流程
   - ⏳ 回收流程
   - ⏳ 遗失处理

2. **资产盘点**
   - ⏳ 创建盘点任务
   - ⏳ 盘点执行和结果提交
   - ⏳ 盘点报告生成和导出

3. **操作日志与报表**
   - ⏳ 操作日志查询和筛选
   - ⏳ 报表配置器
   - ⏳ Excel/CSV 导出

4. **升级管理**
   - ⏳ 版本信息查询
   - ⏳ 套餐配置
   - ⏳ 续费操作记录

### 🔜 迭代 3: 耗材管理

1. **耗材基础**
   - ⏳ 耗材分类、列表、详情 CRUD
   - ⏳ 库存预警设置
   - ⏳ 耗材统计

2. **耗材操作流程**
   - ⏳ 采购与入库
   - ⏳ 领用/出库
   - ⏳ 耗材处理（过期/损坏/遗失）

3. **出库管理**
   - ⏳ 月底盘点
   - ⏳ 出库对账
   - ⏳ 报表生成

### 🔜 迭代 4: 高级功能与优化

1. **批量导入导出**
   - ⏳ Excel/CSV 模板
   - ⏳ 批量导入校验
   - ⏳ 自定义字段导出

2. **可视化报表增强**
   - ⏳ 可配置仪表板
   - ⏳ 更多图表类型
   - ⏳ 报表订阅

3. **权限细粒度控制**
   - ⏳ 按公司/部门/资产类型的权限矩阵

4. **附件存储优化**
   - ⏳ 文件压缩和缩略图
   - ⏳ 对象存储接口

5. **性能优化**
   - ⏳ 数据库索引优化
   - ⏳ API 响应缓存
   - ⏳ 前端虚拟滚动

6. **文档编写**
   - ⏳ API 接口文档
   - ⏳ 部署文档
   - ⏳ 用户手册

## 技术架构

### 前端技术栈
- React 18 + TypeScript
- Vite 构建工具
- Tailwind CSS + shadcn/ui
- React Router v6
- TanStack Query (数据管理)
- Axios (HTTP 客户端)
- Recharts (图表)
- Zustand (状态管理)

### 后端技术栈
- Node.js 18+ 
- Koa 框架
- TypeScript
- better-sqlite3 数据库
- JWT 认证

### 部署方案
- Docker 容器化
- Nginx 反向代理
- GitHub Actions CI/CD

## 项目结构

```
.
├── dootask-plugin/          # DooTask 插件配置
│   ├── config.yml           # 插件配置
│   ├── docker-compose.yml   # Docker Compose 配置
│   └── nginx.conf           # Nginx 配置
├── ui/                      # React 前端
│   ├── src/
│   │   ├── components/      # UI 组件
│   │   ├── pages/           # 页面组件
│   │   ├── api/             # API 客户端
│   │   ├── lib/             # 工具函数
│   │   ├── hooks/           # 自定义 Hooks
│   │   └── types/           # TypeScript 类型
│   └── package.json
├── server/                  # Koa 后端
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── services/        # 业务逻辑
│   │   ├── routes/          # 路由
│   │   ├── middleware/      # 中间件
│   │   ├── database/        # 数据库
│   │   ├── utils/           # 工具函数
│   │   └── types/           # TypeScript 类型
│   └── package.json
├── .github/workflows/       # CI/CD 配置
├── Dockerfile               # Docker 构建配置
└── README.md
```

## 数据库表结构（15+ 表）

### 核心表
- `companies` - 公司信息
- `departments` - 部门信息
- `users` - 用户信息
- `roles` - 角色
- `permissions` - 权限
- `role_permissions` - 角色权限关联
- `user_roles` - 用户角色关联

### 资产相关
- `asset_categories` - 资产分类
- `assets` - 资产主表
- `asset_operations` - 资产操作记录

### 审批相关
- `approvals` - 审批记录
- `approval_logs` - 审批日志

### 耗材相关
- `consumable_categories` - 耗材分类
- `consumables` - 耗材
- `consumable_operations` - 耗材操作记录

### 盘点相关
- `inventory_tasks` - 盘点任务
- `inventory_task_items` - 盘点明细

### 其他
- `notifications` - 通知
- `system_settings` - 系统设置
- `operation_logs` - 操作日志
- `version_info` - 版本信息

## API 接口（已实现）

### 系统管理
- `GET /api/system/companies` - 获取公司列表（树形）
- `POST /api/system/companies` - 创建公司
- `PUT /api/system/companies/:id` - 更新公司
- `DELETE /api/system/companies/:id` - 删除公司
- `GET /api/system/users` - 获取用户列表
- `POST /api/system/users` - 创建用户
- `POST /api/system/users/import` - 批量导入用户
- `GET /api/system/roles` - 获取角色列表
- `POST /api/system/roles` - 创建角色
- `GET /api/system/permissions` - 获取所有权限

### 资产管理
- `GET /api/assets` - 获取资产列表
- `GET /api/assets/:id` - 获取资产详情
- `POST /api/assets` - 创建资产
- `PUT /api/assets/:id` - 更新资产
- `DELETE /api/assets/:id` - 删除资产
- `GET /api/assets/statistics` - 获取资产统计
- `POST /api/assets/import` - 批量导入资产
- `GET /api/assets/categories` - 获取分类列表
- `POST /api/assets/categories` - 创建分类

### 审批管理
- `GET /api/approvals` - 获取审批列表
- `GET /api/approvals/:id` - 获取审批详情
- `POST /api/approvals/:id/process` - 处理审批
- `POST /api/approvals/:id/cancel` - 取消审批
- `GET /api/approvals/pending-count` - 获取待审批数量

### 仪表板
- `GET /api/dashboard` - 获取仪表板完整数据
- `GET /api/dashboard/asset-overview` - 获取资产概览
- `GET /api/dashboard/assets-by-category` - 按分类统计
- `GET /api/dashboard/asset-trend` - 获取资产趋势
- `GET /api/dashboard/todos` - 获取待办事项

## 下一步计划

1. 实现剩余的资产操作流程（借用、归还、派发、维修、报废等）
2. 完成资产盘点功能
3. 实现操作日志和报表导出
4. 实现耗材管理完整功能
5. 添加批量导入导出功能
6. 编写 API 文档和用户手册
7. 性能优化和测试

## 注意事项

1. 当前使用临时用户 ID（userId = 1），需要实现 JWT 认证
2. DooTask 集成需要实际的 API 对接
3. 文件上传功能需要实现 multer 中间件
4. 需要添加更多的错误处理和数据校验
5. 前端页面需要基于现有 API 完善实现

## 启动项目

### 开发环境

```bash
# 后端
cd server
npm install
npm run dev  # 端口 3000

# 前端
cd ui
npm install
npm run dev  # 端口 5173
```

### 生产部署

```bash
# 构建 Docker 镜像
docker build -t asset-management-plugin .

# 运行容器
docker-compose up -d
```

## 贡献者

Asset Management Plugin Development Team

---

**最后更新**: 2024-01-14
