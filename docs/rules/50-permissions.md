# 资产 Hub 插件权限模型与访问控制规划（公司管理 / 角色管理 / 细粒度权限）

## 一、目的与适用范围

- **目的**：规范 Asset Hub 插件的权限模型与访问控制方式，明确：
  - 公司管理与角色管理在权限体系中的定位；
  - 三类核心用户（系统/资产管理员、审批人、普通申请人）的能力边界；
  - 环境变量与"角色管理"页面在权限中的职责划分。
- **适用范围**：
  - 目录：`web/**`（Next.js Web 应用）；
  - 与 DooTask 宿主集成的权限相关逻辑（通过 `@dootask/tools` 获取用户信息、选择用户等）。

> 说明：本文件是权限与角色设计的约束源，新增或调整权限逻辑时，应先更新本文件，再改代码。

---

## 二、核心概念与角色划分

### 2.1 三类系统身份（最小划分）

本系统在权限层面，最小划分为 **3 类"身份"**：

1. **系统 / 资产管理员（Admin）**
   - 典型对象：IT 资产管理员、行政资产管理员、系统运维管理员。
   - 职责：
     - 维护系统基础配置：公司、角色、审批策略、操作模板、告警开关、报表视图等；
     - 维护资产与耗材的基础数据（新增、入库、盘点、报废、库存调整等）；
     - 具备查看与导出全量数据、运行高危操作的能力。
   - 技术上通过环境变量 `ASSET_HUB_ADMIN_USER_IDS` 定义（详见第 3 章）。

2. **审批人（Approver）**
   - 典型对象：部门负责人、财务负责人、仓库主管、资产管理员中的审批角色等。
   - 职责：
     - 在采购、入库、领用、借用/归还、出库、报废等操作需要审批时，对审批请求执行"同意 / 拒绝"等决策；
     - 使用审批中心视图（如"待我审批""我处理的"）完成日常审批工作。
   - 技术上通过独立环境变量（建议命名为 `ASSET_HUB_APPROVER_USER_IDS`）定义，或由 Admin 兼任。

3. **普通申请人 / 使用人（User）**
   - 典型对象：普通员工、一线使用人。
   - 职责：
     - 发起各类资产/耗材相关操作（如领用、借用、耗材出库等）的申请；
     - 查看与自己相关的资产、耗材记录和审批结果。
   - 一般不具备系统配置与全量数据修改能力。

> 约束：无论未来是否引入更多业务角色（如"耗材管理员""分公司资产管理员"），**技术权限层面仍以这三大类身份为基础**，通过业务规则再做细化。

### 2.2 公司管理与角色管理在权限模型中的定位

- **公司管理（Company Management）**
  - 功能定位：维护集团公司、子公司、分支机构等组织实体，作为资产、耗材和审批"公司维度"的主数据。
  - 典型用途：
    - 资产归属与统计按公司维度进行区分；
    - 审批策略与预算控制按公司维度差异化配置；
    - 报表与盘点按公司筛选和汇总。
  - 权限定位：**仅系统/资产管理员（Admin）可写**，其他角色仅通过只读方式引用公司数据。

- **角色管理（Role Management）**
  - 功能定位：维护"业务角色"字典，如：
    - 超级管理员（system）；
    - 资产管理员（asset）；
    - 耗材管理员（consumable）；
    - 部门负责人等。
  - 不代表登录账号本身，而是 **"业务身份 / 职责标签"，供审批配置与审计使用**。
  - 权限定位：
    - 仅系统/资产管理员（Admin）可以新增/编辑/删除角色及其成员；
    - 审批逻辑中可以引用角色（如"默认审批人类型 = 角色"），但**底层技术权限仍由环境变量与用户上下文控制**。

---

## 三、环境变量与身份判定

### 3.1 环境变量约定

1. **系统 / 资产管理员列表**
   - 变量名：`ASSET_HUB_ADMIN_USER_IDS`
   - 格式：逗号分隔的宿主用户 ID 列表，例如：
     - `ASSET_HUB_ADMIN_USER_IDS=1,2,3`
   - 说明：
     - 对应 DooTask 宿主中的用户 ID；类型可以为字符串或数字，代码需要统一转成字符串比较。
     - 表示**具备 Admin 身份**的宿主用户集合。

2. **审批人列表**
   - 建议变量名：`ASSET_HUB_APPROVER_USER_IDS`
   - 格式：逗号分隔的宿主用户 ID 列表，例如：
     - `ASSET_HUB_APPROVER_USER_IDS=10,11,12`
   - 说明：
     - 对应具备"审批能力"的用户集合；
     - 与 `ASSET_HUB_ADMIN_USER_IDS` 可以有交集（Admin 自然也可以具备审批能力）。

> 约束：**任何需要根据"用户是谁"做技术权限控制的逻辑，优先通过上述环境变量 + 当前用户 ID 计算得到布尔值来判断**，避免直接在业务代码中硬编码 ID。

### 3.2 用户身份解析与工具函数

- 当前用户解析：
  - 服务端：使用已有的 `extractUserFromRequest` 或类似工具，从请求中提取 `userId`（与 DooTask 保持一致）。
  - 客户端：通过 `@dootask/tools`（如 `getUserInfo`）获取当前用户 ID，并必要时通过服务端 API 统一解析权限。

- 服务端提供统一工具函数（位于 `web/lib/utils/permissions.ts`）：
  - `isAdminUser(userId?: string | number | null): boolean`
    - 判断 `userId` 是否存在于 `ASSET_HUB_ADMIN_USER_IDS` 集合中。
    - 当未配置任何管理员 ID 时，返回 `false`（不视为"所有人都是管理员"）。
  - `isApproverUser(userId?: string | number | null): boolean`
    - 判断 `userId` 是否存在于 `ASSET_HUB_APPROVER_USER_IDS` 集合中。
  - `canApproveUser(userId?: string | number | null): boolean`
    - 等价于 `isAdminUser(userId) || isApproverUser(userId)`。

> 注：函数名使用 `User` 后缀是为了避免与业务层权限函数（如针对具体资源的权限判断）产生命名冲突。

- 客户端可提供简化 Hook（如 `usePermissions`）：
  - 通过一个统一的 `/api/me` 或 `/api/system/permissions` 获取当前用户的权限标记（`isAdmin, isApprover` 等）；
  - 在 UI 层用来隐藏/显示入口、禁用按钮等（**注意：UI 层只做"软控制"，硬限制仍由服务端负责**）。

---

## 四、公司管理的权限规划

### 4.1 功能范围回顾

- 数据表：`companies`
  - 字段：`id, name, code, description, created_at, updated_at` 等；
  - `code` 为唯一值，用于资产归属、审批策略和对外集成时的稳定标识。
- API：
  - `GET /apps/asset-hub/api/system/companies`
  - `POST /apps/asset-hub/api/system/companies`
  - `GET /apps/asset-hub/api/system/companies/:id`
  - `PUT /apps/asset-hub/api/system/companies/:id`
  - `DELETE /apps/asset-hub/api/system/companies/:id`
- 页面：
  - `/apps/asset-hub/{locale}/system/company`：公司管理页面（列表 + 新增/编辑/删除）。

### 4.2 权限策略

1. **页面访问**
   - `/apps/asset-hub/{locale}/system/company`：
     - 仅当当前用户为 Admin（`isAdmin(userId) === true`）时允许访问；
     - 非 Admin 用户访问时，应重定向到首页或返回 403 页面（具体交互可在实现时细化）。

2. **API 访问**
   - `GET /api/system/companies`：
     - 对所有登录用户开放只读访问，用于资产/耗材表单中选择公司；
     - 如需进一步收紧，可在后续迭代中限定为"登录用户可读"。
   - `POST /api/system/companies`、`PUT /api/system/companies/:id`、`DELETE /api/system/companies/:id`：
     - 仅 Admin 可调用（`isAdmin(userId)` 必须为 `true`）。

3. **与资产/耗材的关系（规划指引）**
   - 后续在资产、耗材及相关操作表/接口中引入 `company_code`/`company_id` 字段时，应遵循：
     - **写入公司字段的权限**：仅 Admin 或经配置允许的操作发起人（例如在申请资产时只能填自己所在公司）；
     - **删除公司的限制**：如果某公司已被资产/耗材/审批等记录引用，必须先迁移/处理这些记录，方可删除公司。

---

## 五、角色管理与 DooTask 用户集成

### 5.1 角色数据模型扩展

- 数据表：`roles`
  - 现有字段：`id, name, scope, description, created_at, updated_at`。
  - 规划新增字段：
    - `member_user_ids TEXT`：
      - 存储与该角色关联的宿主用户 ID 列表；
      - 建议为 JSON 字符串形式，例如：`["1001","1002"]`。

- TypeScript 类型（规划）：
  - `Role`：
    - 增加 `members?: string[]` 字段，由 `member_user_ids` 解析得出；
    - 延续现有 `scope` 枚举（如 `system` / `asset` / `consumable`）。

### 5.2 角色管理页面的成员配置（基于 selectUsers）

- 页面：`/apps/asset-hub/{locale}/system/role`
- 角色编辑弹窗中，在"角色名称 / 作用域 / 描述"基础上，**新增一个"角色成员（可选）"配置块**：
  - 使用 `@dootask/tools` 暴露的：
    - `selectUsers`：选择宿主用户 ID；
    - `fetchUserBasic`：根据用户 ID 反查用户昵称/名称，用于展示；
  - 交互方式可以参考 `ActionConfigTable` 中"默认审批人"的配置逻辑（约 `L209` 处）：
    - 点击"选择用户"按钮 → 调用 `selectUsers`；
    - 将返回的用户列表解析为 `{ id, name }`；
    - 将 `id` 存入角色的 `members` 数组，将 `name` 存入本地 `userNames` 映射用于 UI 展示；
    - 支持清空成员列表。

> 要求：**角色管理不新增独立的"成员管理页"**，仅在现有弹窗表单中增加一个"成员选择"配置区块，即可满足需求。

### 5.3 角色管理 API 与仓储约束

- API：
  - `GET /api/system/roles` / `GET /api/system/roles/:id`：
    - 在返回中增加 `members: string[]` 字段（可为空数组）。
  - `POST /api/system/roles` / `PUT /api/system/roles/:id`：
    - 接收可选 `members: string[]` 字段，并写入 `member_user_ids`。

- 仓储层：
  - `RoleRow` 类型增加 `member_user_ids: string | null` 字段；
  - `mapRow`：
    - 负责将 `member_user_ids` 反序列化为 `members: string[]`；
  - `createRole` / `updateRole`：
    - 负责将 `members: string[]` 序列化为 JSON 存入 `member_user_ids`。

### 5.4 审批配置与角色的关系

- 审批配置表：`asset_action_configs`
  - 已支持字段：
    - `default_approver_type`：`none | user | role`；
    - `default_approver_refs`：当类型为 `user` 时存宿主用户 ID，当类型为 `role` 时存角色 ID 列表。

- 规划约束：
  - 当 `default_approver_type = "role"` 时：
    - 视为"按业务角色指派审批人"，需要通过 `roles` 表与其 `members` 字段解析出候选审批用户；
    - 多个角色 ID 或角色内多个成员并存时，根据前端/后端设计：
      - 可在前端发起审批时，要求申请人从候选成员中选择一个具体审批人；
      - 或在后端实现轮询/策略选择，但需在规则中明确记录。

- 审批记录表：`asset_approval_requests`
  - 规划新增字段（可选）：
    - `approver_role_id`：记录审批时所依据的角色 ID，便于审计与报表归类。

> 重要：**角色管理层主要负责表达"谁是资产管理员/部门负责人/仓库管理员等业务身份"，而不是直接决定"谁有技术权限访问页面或 API"**。技术权限仍由第 3 章的环境变量判定。

---

## 六、细粒度权限控制矩阵（概要）

### 6.1 页面权限（按三类身份）

> 下表中的"访问"仅指路由可达和页面可渲染；具体按钮/操作仍需参考接口权限。

- **系统管理相关**
  - `/apps/asset-hub/{locale}/system`
  - `/apps/asset-hub/{locale}/system/company`
  - `/apps/asset-hub/{locale}/system/role`
  - `/apps/asset-hub/{locale}/system/approval`
  - `/apps/asset-hub/{locale}/system/alerts`
  - `/apps/asset-hub/{locale}/system/operation`
  - `/apps/asset-hub/{locale}/system/data/reports`
  - `/apps/asset-hub/{locale}/system/upgrade`

- **访问规则**：
  - Admin：允许访问上述全部系统管理页面；
  - Approver / User：默认不允许访问；如访问，应重定向或返回 403。

- **业务页面（资产/耗材/审批中心等）**
  - 资产列表、耗材列表、审批列表等业务页面：
    - User：可访问与自己相关的视图（例如"我发起的"申请）；
    - Approver：可访问与自己审批任务相关的视图（例如"待我审批"）；
    - Admin：可访问全部业务视图。

> 具体到每个页面的入口显示，可以通过客户端 Hook（如 `usePermissions`）做 UI 级别控制，但**最终能否访问由服务端中间件与路由处理决定**。

### 6.2 API 权限（概要）

> 这里只列出与公司管理、角色管理和审批直接相关的接口，其它资产/耗材 API 在各自规则文件中细化。

1. **公司管理**
   - `GET /api/system/companies`：所有登录用户（User / Approver / Admin）可读；
   - `POST /api/system/companies`：仅 Admin；
   - `GET /api/system/companies/:id`：所有登录用户可读；
   - `PUT /api/system/companies/:id`：仅 Admin；
   - `DELETE /api/system/companies/:id`：仅 Admin，且需考虑是否存在引用。

2. **角色管理**
   - `GET /api/system/roles`、`GET /api/system/roles/:id`：默认仅 Admin 使用后台页面调用（如需对外展示，可另行规划）；
   - `POST /api/system/roles`、`PUT /api/system/roles/:id`、`DELETE /api/system/roles/:id`：仅 Admin。

3. **系统配置 / 审批配置**
   - `GET /api/system/config`：Admin 可读（用于系统概览 KPI），如后续需要普通用户看到概要信息，可适度放宽；
   - `GET /api/config/approvals/*`、`PUT /api/config/approvals/*`：仅 Admin。

4. **审批相关（仅与权限相关部分）**
   - `GET /api/approvals`：
     - User：仅允许查询"我发起的"或"与我相关"的审批记录（依据查询参数与服务端校验）；
     - Approver：可查询待我审批/我处理的记录；
     - Admin：可以查询全量记录。
   - `POST /api/approvals`（发起审批）：
     - 所有登录用户（User / Approver / Admin）可发起，但具体操作是否需要审批由审批配置决定。
   - 审批决策相关接口（如后续增加 `PATCH /api/approvals/:id/decision`）：
     - 仅 `canApprove(userId)` 为真（Admin + Approver）时可调用。

> 统一要求：**所有写操作接口都必须在服务端显式校验权限，不得仅依赖前端 UI 隐藏按钮。**

---

## 七、与现有"角色管理"的不冲突原则

为避免权限实现与角色管理相互掣肘，本规则明确以下原则：

1. **技术权限优先由环境变量 + 用户 ID 决定**
   - 是否可以访问 `/system/**` 页面、是否可以修改公司/角色/审批配置、是否可以执行审批决策等，**一律由环境变量结合当前用户 ID 判定**；
   - 角色记录（`roles`）中的 `members` 不直接决定这些技术权限，只提供"业务角色绑定关系"信息。

2. **角色管理主要服务于业务语义与审批配置**
   - 角色名称、作用域与成员列表，主要用于：
     - 审批配置中通过 `default_approver_type = "role"`、`default_approver_refs` 来声明"默认由哪些角色负责审批"；
     - 审批记录与报表中展示"由哪个角色/角色成员处理了这次操作"；
   - 即：**角色更像"业务标签"而非"技术权限列表"**。

3. **演进路线建议**
   - **阶段 1（当前规划阶段）**：
     - 完全依赖环境变量实现 Admin / Approver / User 三类技术权限；
     - 角色表与角色管理页面用于维护业务角色与成员，不参与硬权限判断。
   - **阶段 2（角色驱动审批）**：
     - 在审批创建流程中，基于审批配置中的角色 ID 与角色成员列表，推荐/限制可选审批人；
     - 审批记录中写入 `approver_role_id`，实现"按角色维度的审批审计与报表"。
   - **阶段 3（可选，高级权限模型）**：
     - 如有需要，可逐步将"谁具备审批能力"的判定，从纯环境变量迁移到"角色 + 成员"驱动；
     - 环境变量保留为"超管兜底"与"运维应急"通道。

---

## 八、实施与维护要求

1. **先更规则，后改代码**
   - 新增或调整与权限、公司管理、角色管理相关的行为前，应先在本文件中补充/修改说明，再进行实现；
   - 避免"实现先跑、文档滞后"，确保团队与 AI 在权限语义上保持一致。

2. **测试要求**
   - 权限相关改动必须覆盖以下用例：
     - Admin / Approver / User 三类身份分别访问关键页面与接口的行为差异；
     - 缺失用户上下文、环境变量配置异常（如 ID 不合法）的降级行为；
     - 与 DooTask 宿主集成（`selectUsers` / `fetchUserBasic`）在有宿主和无宿主场景下的兼容处理。

3. **与其他规则文件的关系**
   - 本文件与以下规则互为补充：
     - `docs/rules/20-web.md`：Web 应用职责与一体化后端约束；
     - `docs/rules/21-web-routing.md`：页面与 API 路由规划；
     - `docs/rules/30-feature-plan.md`：功能需求与模块规划（系统管理、资产管理、耗材管理等）；
     - `docs/rules/40-workflow-approval.md`：审批流程与资产操作审批约束。
   - 当本文件与其他规则存在冲突时，应优先对齐产品/架构结论，并更新相关规则以保持一致。
