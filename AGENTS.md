# Asset Hub 项目说明

## 一、项目总览

- **项目定位**：Asset Hub 是 DooTask 的资产管理插件，提供资产与耗材的全生命周期管理能力（系统管理、资产管理、耗材管理等）。
- **访问前缀**：所有页面与 HTTP API 必须挂载在 `/apps/asset-hub` 前缀下。
- **技术栈与目录**
  - Web 应用：Next.js（App Router）+ React + TypeScript + Tailwind CSS + shadcn/ui，代码集中在 `web/` 目录。
  - 插件适配：`dootask-plugin/` 目录负责 DooTask 插件规范相关的配置与适配代码，不承载核心业务逻辑。
  - 数据存储：使用 `sqlite3` 作为本地嵌入式数据库，仅由 Next.js 服务端代码访问。
- **语言与主题**
  - 语言：页面路由统一采用 `/apps/asset-hub/{locale}/...` 形式，当前只支持 `zh`、`en`，其它语言会归一化到最近的受支持语言。
  - 主题：通过 URL 参数 `theme` 获取主题；包含 `dark` 视为深色主题，否则视为浅色主题，由 `next-themes` 驱动，并可被 DooTask 宿主覆盖。

## 二、路由与模块概览

- **首页 / 仪表盘**
  - 路由：`/apps/asset-hub/{locale}`
  - 用途：资产总览仪表盘、资产分布统计、审批中心与代办入口、帮助中心入口等。

- **系统管理**
  - 前缀：`/apps/asset-hub/{locale}/system`
  - 示例子路由：
    - `company`：公司管理。
    - `role`：角色管理与资产类型管理员配置。
    - `approval`：审批中心配置。
    - `data/reports`：报表统计。
    - `data/custom-reports`：自定义报表（预留）。
    - `operation`：操作管理。
    - `upgrade`：版本与用户数方案管理。

- **资产管理**
  - 前缀：`/apps/asset-hub/{locale}/assets`
  - 示例子路由：
    - `settings`：资产字段与状态配置。
    - `list`：资产列表（筛选 / 排序 / 分页）。
    - `import-export`：资产导入导出。
    - `categories`：资产分类管理。
    - `operations/purchase`：采购流程。
    - `operations/inbound`：入库流程。
    - `operations/receive`：领用流程。
    - `operations/borrow-return`：借用 / 归还流程（含逾期提醒）。
    - `operations/distribute`：派发流程。
    - `operations/other`：其它操作（维修、报废、回收、遗失等）。
    - `inventory`：资产盘点任务列表与详情。

- **耗材管理**
- 前缀：`/apps/asset-hub/{locale}/consumables`
- 示例子路由：`settings`、`operations`、`inventory` 等（实际已实现列表、详情、操作时间线、盘点、告警与审计报表等能力，详细能力说明见 `.cursor/rules/30-feature-plan.mdc` 中的“耗材管理”章节）。

- **帮助中心**
  - 页面：`/apps/asset-hub/{locale}/help`，集中展示使用指南和常见问题。

- **API 概要**
  - 所有对外 API 路径前缀为 `/apps/asset-hub/api/**`。
  - 示例：
    - `/apps/asset-hub/api/health`：健康检查。
    - `/apps/asset-hub/api/assets`：资产列表查询与新增。
    - `/apps/asset-hub/api/assets/:id`：资产详情、更新、删除（或标记删除/报废）。
    - `/apps/asset-hub/api/system/config`：系统配置摘要。
    - `/apps/asset-hub/api/system/companies`、`/system/roles`：公司与角色列表。
    - `/apps/asset-hub/api/me`：当前登录用户信息（通过宿主交互）。

## 三、审批与资产操作（概要）

- 审批能力优先围绕「资产操作（operations）」展开，而不是独立的一套审批系统。
- 核心实体（抽象层面）：
  - `assets`：资产主表，记录资产基础信息与状态。
  - `asset_operations`：资产操作记录表，记录采购、入库、领用、借用、归还、派发、维修、报废等操作。
  - `asset_approval_requests`：审批请求表，将需要审批的业务操作抽象为统一的请求实体，并通过外键与 `asset_operations` / `assets` 关联。
- 审批状态枚举：
  - `draft` / `pending` / `approved` / `rejected` / `cancelled` 为统一的审批状态值。
- 采购 / 入库流程示例：
  - 采购：发起采购申请时创建 `asset_operations(type="purchase")` 与对应 `asset_approval_requests(type="purchase")`，审批通过后更新操作状态为完成。
  - 入库：对已通过采购审批的资产，发起入库确认操作，可根据配置决定是否需要审批，并在审批通过后更新资产状态与入库信息。

更多审批状态机、数据模型与 API 约束，参见 `.cursor/rules/40-workflow-approval.mdc`。

## 四、Graphiti 知识图谱与长期记忆

- **角色定位**
  - 作为本仓库中 AI 的长期记忆库，用于存放项目约束、用户偏好、可复用流程等信息，便于跨会话复用。
  - 作为（可选的）业务侧知识图谱引擎，用于资产、公司、人员、操作等实体关系建模（详细规划可在独立规则中扩展）。
  - 当前使用的 `group_id`：`dootask-plugin-asset-hub`。

- **节点类型约定**
  - **Preference（偏好 / 风格）**
    - 用户或项目的长期偏好，例如回答语言、是否偏好简洁回复、前后端统一使用 TypeScript、优先使用 Next.js Route Handlers 等。
  - **Procedure（流程 / 做事方式）**
    - 在本仓库开发时约定的工作步骤，例如：
      - 新增重要业务模块前，先补 `.cursor/rules` 设计文档，再写代码。
      - 数据库结构变更必须同步更新迁移脚本并执行测试。
    - 也可以记录对用户重要的操作流程（如发布到 DooTask 应用市场的步骤）。
  - **Requirement（约束 / 需求）**
    - 关键架构 / 业务约束，例如：
      - 所有页面和 HTTP API 必须挂载在 `/apps/asset-hub` 前缀下。
      - 审批状态机仅使用 `{draft, pending, approved, rejected, cancelled}`。
      - 资产相关接口优先通过 Next.js Route Handlers 实现。
    - 中长期产品需求（如首页必须展示资产/公司/角色核心 KPI 等）。

- **使用顺序（读）**
  - 进行任何「非纯回答型」任务前，应先阅读与当前任务相关的 `.cursor/rules/*.mdc` 规则文件，这些文件是本项目最权威的约束来源。
  - 在此基础上，再使用 Graphiti 的搜索能力补充上下文，典型步骤为：
    - 使用节点搜索（如 `search_nodes`）查询与当前任务相关的 Preference / Procedure / Requirement；
    - 使用事实搜索（如 `search_facts`）查询实体间关系与历史决策（例如审批与 DooTask 待办的关联方式）；
    - 审阅检索结果，将与当前任务高度相关的偏好、流程和约束纳入后续决策。

- **写入时机（写）**
  - 用户表达了新的长期偏好（Preference）时。
  - 形成了可复用的工作流程（Procedure）时，例如标准化的审批实现步骤、发布流程等。
  - 确立了新的重要约束 / 需求（Requirement）且未来会被复用时。
  - 写入时应：
    - 尽量拆成较小的记忆单元，便于精确检索。
    - 优先更新已有记忆而不是重复添加近似内容。
    - 明确标注类型（Preference / Procedure / Requirement）与简短分类标签（如 `web-routing`、`approvals`、`dootask-integration` 等）。

- **记忆工具的使用**
  - 当用户明确要求“记住某件事 / 偏好 / 规则”，或当前信息明显需要在未来会话中复用时，应调用环境提供的记忆写入工具（例如 `update_memory` / `add_memory` 等）将其持久化到 Graphiti。
  - 写入时应遵守上述节点类型划分，并为每条记忆选择合适的类型与标签，避免混淆偏好、流程与约束。

- **优先级与一致性**
  - `.cursor/rules/*.mdc` 是本仓库的显式规则源，优先级高于 Graphiti 记忆。
  - 当 Graphiti 中的内容与规则文件或实际代码状态不一致时，应以规则与代码为准，并在需要时更新 Graphiti 记忆，保持两者一致。
  - 在具体任务中应尊重已存偏好、遵循既有流程，并在设计路由、数据结构、审批状态机等时优先参考已存 Requirement 与 Facts。

- **最佳实践小结**
  - 先查再做：在提出重要方案或改动架构前，优先查阅 `.cursor/rules` 与 Graphiti 中已有的设计和约束。
  - 能复用就沉淀：只要发现某个偏好 / 流程 / 约束未来会反复用到，就尽快写入 Graphiti，而不是只放在当前对话里。
  - 保持项目内外一致：确保 Graphiti 中的记忆与规则文件、实际代码长期保持一致，避免“记忆漂移”。

## 五、AI 回复风格与语言偏好

- 总体说明与重要总结（尤其是最终回答的 recap 部分），在不影响技术表达准确性的前提下，应优先使用简体中文进行回复。
- 如用户在对话中明确要求使用其他语言（例如英文），则以用户的显式指令为最高优先级。
- 当你的输出内容已完整形成一次可提交的变更时，请在回答结尾附加一条 *简洁、准确的中文 Git 提交信息*（commit message），方便用户直接复制。

## 六、`.cursor/rules` 规则索引（按场景查阅）

以下规则文件补充本说明中的概要内容，在对应场景中应优先阅读并遵守：

- **`10-dootask-plugin.mdc`**
  - 场景：编辑 `dootask-plugin/**` 目录内的插件配置与宿主集成代码。
  - 要点：插件元数据与清单、入口 URL 必须指向 `/apps/asset-hub`，业务逻辑尽量放在 `web/` 中实现。

- **`20-web.mdc`**
  - 场景：在 `web/**` 下实现或修改页面、Next.js Route Handlers、数据库访问与服务端逻辑。
  - 要点：Next.js 一体化后端、统一使用 TypeScript、仅在服务端访问 sqlite3、通过 `@dootask/tools` 与宿主交互等。

- **`21-web-routing.mdc`**
  - 场景：设计或调整页面与 API 路由。
  - 要点：以 `/apps/asset-hub` 为根前缀、使用 `{locale}` 语言段、遵守各业务模块的路由规划。

- **`30-feature-plan.mdc`**
  - 场景：理解或调整功能规划、模块边界与优先级。
  - 要点：首页、系统管理、资产管理、耗材管理、版本信息等模块的需求与约束。

- **`40-workflow-approval.mdc`**
  - 场景：实现或修改审批流程、审批 API、与 DooTask 待办的集成。
  - 要点：审批请求表与资产操作表的关系、审批状态机、`/api/approvals` 系列接口、前端页面与宿主集成约定等。

- **`50-permissions.mdc`**
  - 场景：设计或调整权限模型、公司管理与角色管理、以及细粒度访问控制。
  - 要点：三类系统身份（系统/资产管理员、审批人、普通申请人）、环境变量权限约定、公司/角色管理的权限边界以及页面与 API 权限矩阵。

在执行某类任务时，应根据上述索引先阅读对应规则文件，再结合 Graphiti 中的相关记忆与事实完成实现与调整。

## 七、开发约定

- 业务规则与规划以 `.cursor/rules/*.mdc` 为准，`AGENTS.md` / 各 README 只做摘要与导航。
- 开发中如发现“实现与规则文档不一致”，应先更新对应的 `.cursor/rules/*.mdc`（必要时同步更新本文件摘要），再调整代码，避免“实现先跑、文档滞后”。
- 新增重要能力或调整关键流程时，优先补充或更新 `.cursor/rules` 里的设计说明，然后再开写代码。
- AI 协助开发时也应遵守上述约定：先对齐规则文档，再改实现。

