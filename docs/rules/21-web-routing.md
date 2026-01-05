# Web 页面与 API 路由规划说明与约束（基于 /apps/asset-hub 前缀）

## 外部访问前缀

- 所有页面与 HTTP API 对外暴露时，统一挂载在 **`/apps/asset-hub`** 前缀下。
- 下文列出的路径均为"对外 URL"，Next.js 内部可通过 `app/` 目录和 `app/api` 目录实现对应路由。

- **语言段说明**
  - Web 页面统一采用 `/{locale}` 作为首段（例如 `/apps/asset-hub/zh/...`），其中 `locale` 经过归一化后当前仅支持 `zh`、`en`。
  - DooTask 注入的 `system_lang` 会在中间件中自动映射到支持的语言；路径段缺失时默认跳转到 `en`。

## 页面路由规划

### 首页 / 仪表盘

- URL：`/apps/asset-hub/{locale}`
- 用途：资产总览仪表盘、资产分布统计、审批中心与代办入口、帮助中心入口。

### 系统管理

- URL 前缀：`/apps/asset-hub/{locale}/system`
- 子路由：
  - `/`：系统管理总览（卡片跳转至各子模块）。
  - `/company`：公司管理。
  - `/role`：角色管理（含资产类型管理员）。
  - `/approval`：审批中心配置。
  - `/alerts`：系统告警管理。
  - `/backup`：数据备份管理。
  - `/data/reports`：报表统计。
  - `/data/custom-reports`：自定义报表（预留扩展）。
  - `/operation`：操作管理。
  - `/upgrade`：升级管理（版本与用户数方案）。

### 资产管理

- URL 前缀：`/apps/asset-hub/{locale}/assets`
- 子路由：
  - `/`：资产管理总览（跳转或重定向至列表）。
  - `/list`：资产列表（筛选/排序/分页）。
  - `/new`：新增资产。
  - `/[id]`：资产详情页（含操作时间线）。
  - `/categories`：资产分类管理。
  - `/import-export`：资产导入导出。
  - `/inventory`：资产盘点任务列表。
  - `/inventory/[id]`：资产盘点任务详情。
  - `/recycle-bin`：资产回收站（软删除记录的恢复与永久删除）。

### 耗材管理

- URL 前缀：`/apps/asset-hub/{locale}/consumables`
- 子路由：
  - `/`：耗材管理总览（跳转或重定向至列表）。
  - `/list`：耗材列表（筛选/排序/分页）。
  - `/new`：新增耗材。
  - `/[id]`：耗材详情页（含操作时间线）。
  - `/settings`：耗材设置（类别、属性、安全库存等）。
  - `/operations`：耗材操作流程（采购、入库、出库、处理等），与审批和库存联动。
  - `/import-export`：耗材导入导出。
  - `/inventory`：耗材盘点任务列表。
  - `/inventory/[id]`：耗材盘点任务详情。
  - `/alerts`：耗材告警列表（低库存、缺货等）。
  - `/recycle-bin`：耗材回收站（软删除记录的恢复与永久删除）。

### 审批中心

- URL 前缀：`/apps/asset-hub/{locale}/approvals`
- 子路由：
  - `/`：审批列表（Tab：待我审批 / 我发起的 / 全部）。
  - `/[id]`：审批详情页（含审批操作入口）。
  - `/new`：新建审批（独立入口，用于发起采购等无资产关联的审批）。

### 帮助中心

- URL：`/apps/asset-hub/{locale}/help`
- 用途：集中展示 Asset Hub 的功能使用说明和常见问题，可作为首页"帮助中心"快捷方式的目标页面。

## API 路由规划

> 说明：下列路径均为对外 HTTP API 路径，实际在 Next.js 中通过 `app/api/**/route.ts` 实现，对外访问时会带上 `/apps/asset-hub` 前缀。

### 基础健康检查

- `GET /apps/asset-hub/api/health`：应用健康检查，用于调试与监控。

### 用户与权限

- `GET /apps/asset-hub/api/me`：获取当前登录用户信息（通过 `@dootask/tools` 与宿主交互）。

### 资产相关 API

- `GET /apps/asset-hub/api/assets`：查询资产列表（支持筛选与分页）。
- `POST /apps/asset-hub/api/assets`：新增单条资产。
- `GET /apps/asset-hub/api/assets/:id`：获取资产详情。
- `PUT /apps/asset-hub/api/assets/:id`：更新资产信息。
- `DELETE /apps/asset-hub/api/assets/:id`：软删除资产（移入回收站）。
- `POST /apps/asset-hub/api/assets/:id/restore`：恢复已删除资产。
- `DELETE /apps/asset-hub/api/assets/:id/permanent`：永久删除资产。
- `GET /apps/asset-hub/api/assets/export`：导出资产数据（XLSX）。
- `POST /apps/asset-hub/api/assets/import`：导入资产数据（XLSX）。
- `GET /apps/asset-hub/api/assets/import/template`：下载资产导入模板。
- `GET /apps/asset-hub/api/assets/categories`：获取资产分类列表。
- `POST /apps/asset-hub/api/assets/categories`：新增资产分类。
- `PUT /apps/asset-hub/api/assets/categories/:id`：更新资产分类。
- `DELETE /apps/asset-hub/api/assets/categories/:id`：删除资产分类。

### 资产操作 API

- `GET /apps/asset-hub/api/assets/:id/operations`：获取资产操作历史。
- `POST /apps/asset-hub/api/assets/:id/operations`：创建资产操作记录。

### 资产盘点 API

- `GET /apps/asset-hub/api/assets/inventory`：获取盘点任务列表。
- `POST /apps/asset-hub/api/assets/inventory`：创建盘点任务。
- `GET /apps/asset-hub/api/assets/inventory/:id`：获取盘点任务详情。
- `PUT /apps/asset-hub/api/assets/inventory/:id`：更新盘点任务。
- `DELETE /apps/asset-hub/api/assets/inventory/:id`：删除盘点任务。

### 耗材相关 API

- `GET /apps/asset-hub/api/consumables`：查询耗材列表（支持筛选与分页）。
- `POST /apps/asset-hub/api/consumables`：新增单条耗材。
- `GET /apps/asset-hub/api/consumables/:id`：获取耗材详情。
- `PUT /apps/asset-hub/api/consumables/:id`：更新耗材信息。
- `DELETE /apps/asset-hub/api/consumables/:id`：软删除耗材。
- `POST /apps/asset-hub/api/consumables/:id/restore`：恢复已删除耗材。
- `DELETE /apps/asset-hub/api/consumables/:id/permanent`：永久删除耗材。
- `GET /apps/asset-hub/api/consumables/export`：导出耗材数据（XLSX）。
- `POST /apps/asset-hub/api/consumables/import`：导入耗材数据（XLSX）。
- `GET /apps/asset-hub/api/consumables/import/template`：下载耗材导入模板。

### 耗材操作 API

- `GET /apps/asset-hub/api/consumables/:id/operations`：获取耗材操作历史。
- `POST /apps/asset-hub/api/consumables/:id/operations`：创建耗材操作记录。

### 耗材盘点 API

- `GET /apps/asset-hub/api/consumables/inventory`：获取耗材盘点任务列表。
- `POST /apps/asset-hub/api/consumables/inventory`：创建耗材盘点任务。
- `GET /apps/asset-hub/api/consumables/inventory/:id`：获取耗材盘点任务详情。
- `PUT /apps/asset-hub/api/consumables/inventory/:id`：更新耗材盘点任务。

### 耗材告警 API

- `GET /apps/asset-hub/api/consumables/alerts`：获取耗材告警列表。
- `PUT /apps/asset-hub/api/consumables/alerts/:id`：更新告警状态（确认/关闭）。

### 审批相关 API

- `GET /apps/asset-hub/api/approvals`：查询审批列表（支持按 type/status/role 筛选）。
- `POST /apps/asset-hub/api/approvals`：创建审批请求。
- `GET /apps/asset-hub/api/approvals/:id`：获取审批详情。
- `POST /apps/asset-hub/api/approvals/:id/actions`：执行审批操作（approve/reject/cancel）。
- `PUT /apps/asset-hub/api/approvals/:id/approver`：更换审批人。

### 审批配置 API

- `GET /apps/asset-hub/api/config/approvals`：获取审批配置列表。
- `PUT /apps/asset-hub/api/config/approvals/:id`：更新审批配置。

### 系统配置相关 API

- `GET /apps/asset-hub/api/system/config`：获取基础系统配置（公司、角色、基础参数等摘要）。
- `GET /apps/asset-hub/api/system/companies`：公司列表。
- `POST /apps/asset-hub/api/system/companies`：新增公司。
- `PUT /apps/asset-hub/api/system/companies/:id`：更新公司。
- `DELETE /apps/asset-hub/api/system/companies/:id`：删除公司。
- `GET /apps/asset-hub/api/system/roles`：角色列表（含资产类型管理员）。
- `POST /apps/asset-hub/api/system/roles`：新增角色。
- `PUT /apps/asset-hub/api/system/roles/:id`：更新角色。
- `DELETE /apps/asset-hub/api/system/roles/:id`：删除角色。

### 数据备份 API

- `GET /apps/asset-hub/api/system/backups`：获取备份列表。
- `POST /apps/asset-hub/api/system/backups`：创建备份。
- `GET /apps/asset-hub/api/system/backups/:id/download`：下载备份文件。
- `DELETE /apps/asset-hub/api/system/backups/:id`：删除备份。

### 报表统计 API

- `GET /apps/asset-hub/api/reports/assets`：资产统计报表。
- `GET /apps/asset-hub/api/reports/consumables`：耗材统计报表。
- `GET /apps/asset-hub/api/reports/operations`：操作审计报表。

## 迭代说明

上述路由规划已基本落地，后续按需求迭代时应：
1. 优先复用已有路由模式；
2. 新增路由前先更新本文件，保持文档与代码同步。
