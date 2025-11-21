# Asset Hub 项目说明（AGENTS）

> 说明：本文件用于指导 Codex 在本仓库（资产管理插件 Asset Hub）中的行为。  
> 更详细、权威的规则仍以 `.cursor/rules/*.mdc` 为准。

---

## 1. 项目概述

- 本仓库用于开发 DooTask 的资产管理插件 **Asset Hub**，提供资产全生命周期管理能力（系统管理、资产管理、后续扩展的耗材管理等）。
- 插件以 Web 形式嵌入到 DooTask 中：
  - **所有对外访问前缀统一为** `/apps/asset-hub`。
  - 页面路径统一为 `/apps/asset-hub/{locale}/...`，其中 `{locale}` 当前只支持 `zh`、`en`（其它语言会归一到这两种）。
- 技术栈：
  - `web/`：Next.js（App Router）+ React + TypeScript + Tailwind CSS + shadcn/ui。
  - `dootask-plugin/`：仅做 DooTask 插件规范相关配置与集成（插件元数据、入口 URL 等），业务逻辑尽量放在 `web/`。
  - 数据存储：sqlite3，由 Next.js 服务端代码访问。

---

## 2. 硬性约束（必须遵守）

在本仓库中编写或修改代码时，**必须遵守以下约束**：

- **路由与前缀**
  - 所有对外页面和 HTTP API，路径前缀必须是 `/apps/asset-hub`。
  - Web 页面路径统一为 `/apps/asset-hub/{locale}/...`，`{locale}` 必须是 `zh` 或 `en`。
  - API 路由通过 Next.js Route Handlers 实现，内部路径形如：`web/app/api/**/route.ts`，对外为 `/apps/asset-hub/api/*`（例如 `/apps/asset-hub/api/health`、`/apps/asset-hub/api/assets`）。
- **后端架构**
  - 与资产管理相关的业务 HTTP 接口，**优先且原则上只能通过 Next.js Route Handlers 实现**，不要在本仓库再维护单独的 Koa/Express 入口。
  - sqlite3 的读写只能出现在服务端模块（如 Route Handlers 或 server-only 模块），禁止在客户端组件中直接访问数据库。
- **语言与类型**
  - 全仓库统一使用 **TypeScript**。
  - 领域模型 / DTO / 枚举应尽量在前后端复用，避免重复定义。
- **主题与语言**
  - 主题通过 URL 查询参数 `theme` 决定：包含 `dark` 视为深色主题，否则视为浅色。
  - 语言通过路径段 `{locale}` 决定；DooTask 的 `system_lang` 由中间件映射到 `zh` 或 `en`。

---

## 3. 详细规则文档（必须优先阅读）

> 说明：下面这些 `.cursor/rules/*.mdc` 是本项目的「显式规则源」，优先级高于任何记忆或推测。  
> 在执行**任何非纯问答、非琐碎修改**的任务前，应先阅读相关规则文件，并严格遵守。

- **项目整体说明与关键约束**
  - `.cursor/rules/00-project-overview.mdc`
- **Graphiti 记忆使用规范（Preference / Procedure / Requirement 的定义与约束）**
  - `.cursor/rules/05-graphiti-memory.mdc`
- **DooTask 插件集成层职责（`dootask-plugin/` 与 `web/` 的边界）**
  - `.cursor/rules/10-dootask-plugin.mdc`
- **Web 应用架构（Next.js 一体化、数据访问、与 DooTask 的集成）**
  - `.cursor/rules/20-web.mdc`
- **页面与 API 路由规划（包括 `/apps/asset-hub/{locale}/...` 的路由树）**
  - `.cursor/rules/21-web-routing.mdc`
- **功能需求规划（首页 / 仪表盘、系统管理、资产管理等）**
  - `.cursor/rules/30-feature-plan.mdc`
- **审批流程与操作流程（采购 → 入库试点、与 DooTask 待办的集成方式等）**
  - `.cursor/rules/40-workflow-approval.mdc`

**行为要求：**

1. 开始重要改动前，先判断哪些 `.mdc` 与本次任务相关。
2. 使用 Codex 的文件读取能力打开并认真阅读对应规则。
3. 若 Graphiti 记忆与这些规则不一致，**以 `.cursor/rules` 为最终准则**。

---

## 4. Graphiti MCP 使用约定（项目级 group_id）

本项目通过 Graphiti MCP 提供「长期记忆 / 知识图谱」能力。  
**本仓库对应的 Graphiti group_id 固定为：`dootask-plugin-asset-hub`。**

> 注意：Codex 的 MCP 配置是全局的，不应在全局配置中写死具体项目的 group_id。  
> group_id 作为「项目级概念」，应在本文件中约定，并在调用 Graphiti 工具时以参数形式传入。

### 4.1 读取 / 查询 Graphiti 的场景

进行以下类型任务前，应优先使用 Graphiti 工具进行查询（带上 `group_id = "dootask-plugin-asset-hub"`）：

- **Preference（偏好）**
  - 用户 / 项目的回答风格偏好、技术选型偏好等。
- **Procedure（流程）**
  - 在 Asset Hub 开发过程中约定好的「标准步骤」，例如：
    - 新增 API Route Handler 的步骤。
    - 调整数据库结构时的标准流程（更新迁移脚本、执行测试等）。
- **Requirement（约束 / 需求）**
  - 审批状态机、与 DooTask 待办的约束规则。
  - 路由 / API 设计中的约束（如果有记在 Graphiti 中）。
  - 资产接口的分页 / `meta` 规范等。

建议的搜索关键词示例：`"asset-hub"`, `"web routing"`, `"approval workflow"`, `"dootask plugin"`, `"graphiti memory"` 等。

> 在调用 Graphiti MCP 工具（如 `search_nodes` / `search_memory_facts` / `add_memory`）时，**请显式传入 `group_id = "dootask-plugin-asset-hub"` 参数**，而不要依赖全局固定配置。

### 4.2 写入 / 更新 Graphiti 的场景

在以下情况，应将信息写入或更新到 Graphiti（同样带上 `group_id = "dootask-plugin-asset-hub"`）：

- 用户明确表达了新的长期偏好（Preference）。
- 形成了可复用的工作流程（Procedure），例如：
  - 「在 Asset Hub 中新增审批流程的标准步骤」。
  - 「发布到 DooTask 应用市场的固定流水线」。
- 确立了新的重要约束 / 需求（Requirement），例如：
  - 新的 API 前缀 / 路由约束。
  - 审批流 / 资产字段的强制性要求。

写入时：

- 尽量拆成小而清晰的多条记忆，而不是一条很长的混合记忆。
- 使用正确的类型标签（Preference / Procedure / Requirement）。
- 若只是修改已有记忆，应尽量更新原有节点，而不是新增重复语义的节点。
- 如果 Graphiti 中的记忆与 `.cursor/rules` 冲突，必须以 `.cursor/rules` 为准，并据此更新 Graphiti。

---

## 5. 在本仓库中使用 Codex 的行为准则

当 Codex 在本仓库中协助开发时，应遵守以下原则：

- **必须遵守**
  - 所有页面和 API 路由必须挂载在 `/apps/asset-hub` 前缀下，并包含 `{locale}` 段。
  - 资产管理相关接口优先通过 Next.js Route Handlers 实现。
  - sqlite3 访问只能在服务端模块 / Route Handlers 中进行。
  - 使用 TypeScript，避免在本项目中引入混合语言实现。

- **强烈建议**
  - 在 `web/` 中实现主要业务逻辑，在 `dootask-plugin/` 中只做插件配置与宿主集成。
  - 尽量复用领域模型 / DTO 类型，避免前后端重复定义。
  - 新增路由 / 接口前，先对照 `.cursor/rules/21-web-routing.mdc` 与 `.cursor/rules/30-feature-plan.mdc`。

- **避免 / 禁止**
  - 在仓库中引入与本项目规则冲突的独立服务入口。
  - 直接忽略 `.cursor/rules` 或 Graphiti 中已有的明确约束。
  - 在客户端组件中直接访问数据库或宿主 DooTask 环境。

如果在某些场景下必须暂时偏离既有规则，应在对话中清楚说明原因，并在用户确认后执行；若该偏离会成为长期约束，应作为新的 Requirement 写入 Graphiti（带上本项目的 `group_id`）。