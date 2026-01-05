# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 项目概览

Asset Hub 是 DooTask 的资产管理插件，提供资产与耗材的全生命周期管理能力（系统管理、资产管理、耗材管理、审批流程等）。

**技术栈：**
- **Web 应用：** Next.js (App Router) + React + TypeScript + Tailwind CSS + shadcn/ui
- **数据库：** SQLite (better-sqlite3)，仅服务端访问
- **宿主集成：** 通过 `@dootask/tools` 与 DooTask 通信

**目录结构：**
- `web/` - Next.js 主应用（页面、API 路由、业务逻辑）
- `dootask-plugin/` - DooTask 插件配置与元数据（不含业务逻辑）
- `docs/rules/` - 权威的设计规则与约束文档

## 常用命令

所有命令在 `web/` 目录下执行：

```bash
pnpm install          # 安装依赖
pnpm migrate          # 运行 SQLite 迁移与种子数据
pnpm dev              # 启动开发服务器 http://localhost:3000/apps/asset-hub/zh
pnpm build            # 生产构建
pnpm lint             # ESLint 检查
pnpm test             # Vitest 单元测试
pnpm test:e2e         # Playwright 端到端测试（需要 DooTask 宿主配置）
```

安装 shadcn/ui 组件：
```bash
pnpm dlx shadcn@latest add <component>
```

## 架构

### URL 前缀约束

**所有页面和 API 必须挂载在 `/apps/asset-hub` 前缀下**，通过 Next.js basePath 配置实现。

- 页面：`/apps/asset-hub/{locale}/...`（locale 支持 `zh`、`en`）
- API：`/apps/asset-hub/api/...`

### 路由结构

- `app/[locale]/` - 国际化页面
  - `/` - 首页仪表盘
  - `/assets/list` - 资产列表
  - `/assets/[id]` - 资产详情（含操作时间线）
  - `/assets/import-export` - 资产导入/导出
  - `/consumables/...` - 耗材管理
  - `/system/...` - 系统管理（公司、角色、审批配置、告警）
- `app/api/` - Route Handlers
  - `/api/assets` - 资产 CRUD
  - `/api/consumables` - 耗材 CRUD
  - `/api/approvals` - 审批流程
  - `/api/system/...` - 系统配置

### 数据层

```
lib/db/            - 数据库连接与表结构定义
lib/repositories/  - 数据访问层（CRUD 操作）
lib/services/      - 业务逻辑层
lib/types/         - TypeScript 类型定义
```

- **Repository 模式：** 所有数据库操作通过 `lib/repositories/` 进行
- **仅服务端：** SQLite 访问仅限于 Route Handlers 或 server 组件
- **类型共享：** `lib/types/` 中的领域类型在客户端和服务端共用

### 审批系统

审批与资产/耗材操作绑定，而非独立系统：

- `asset_operations` - 记录业务操作（采购、入库、借用等）
- `asset_approval_requests` - 与操作关联的审批请求
- `asset_action_configs` - 配置哪些操作需要审批

审批状态：`pending`、`approved`、`rejected`、`cancelled`

### 权限模型

通过环境变量控制的三类用户：

1. **Admin**（`ASSET_HUB_ADMIN_USER_IDS`）：系统管理全部权限
2. **Approver**（`ASSET_HUB_APPROVER_USER_IDS`）：可执行审批
3. **User**：可提交申请、查看自己的数据

权限检查：`lib/utils/permissions.ts` 提供 `isAdminUser()`、`isApproverUser()`、`canApproveUser()` 工具函数。

### DooTask 集成

- `components/providers/DooTaskBridge.tsx` - 初始化 `@dootask/tools`
- 用户上下文通过 URL 参数注入：`theme`、`lang`、`user_id`、`user_token`
- 审批通知通过 `requestAPI("dialog/msg/sendbot")` 发送 Bot 消息
- 非 DooTask 宿主环境下自动降级

## 关键约束

1. **规则文件优先：** `docs/rules/*.md` 定义设计规范，修改代码前应先更新规则。

2. **路由国际化：** 所有页面路由必须包含 `{locale}` 段，支持 `zh`、`en`。

3. **主题处理：** 从 URL 参数 `theme` 获取主题；包含 `dark` 则为深色模式，由 `next-themes` 驱动。

4. **无独立后端：** 所有 API 使用 Next.js Route Handlers（`app/api/**/route.ts`），不使用 Express/Koa。

## 交互规范

- **提问时附带建议**：当需要向用户提问或请求澄清时，应同时提供具体的建议选项或推荐方案，帮助用户快速决策，而非仅抛出开放式问题

## 语言偏好

- 技术总结和关键结论优先使用简体中文
- 遵循用户明确指定的语言偏好
- 当改动形成自然的提交单元时，附带推荐的 Git commit message

## 规则文件索引

在特定场景下开发时，请参考 `docs/rules/` 中的规则：

| 文件 | 适用场景 |
|------|----------|
| `10-dootask-plugin.md` | 编辑 `dootask-plugin/` 目录 |
| `20-web.md` | Web 应用结构、TypeScript、数据库 |
| `21-web-routing.md` | 页面与 API 路由设计 |
| `30-feature-plan.md` | 功能需求、模块边界 |
| `40-workflow-approval.md` | 审批流程、状态机、DooTask 待办集成 |
| `50-permissions.md` | 权限模型、公司/角色管理 |

## 扩展规则

详见 @.claude/rules/graphiti.md 了解 Graphiti 长期记忆集成。

Graphiti 用于持久化跨会话的用户偏好、工作流程、重要约束和关键事实，统一使用 `group_id: "dootask-plugin-asset-hub"`。在进行实质性工作前应先查询已有记忆，发现可复用的偏好/流程/约束时应及时写入。
