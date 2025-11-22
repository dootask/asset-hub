## 耗材模块当前状态与后续计划（给 AI 用的总结）

> 使用说明：下次询问 AI 时，可以直接把本文件内容（或文件路径 `consumables-module-status.md`）贴给 AI，作为“当前进度 + 约束 + 下一步计划”的统一上下文。

---

### 一、整体背景

- **项目**：Asset Hub（DooTask 资产管理插件），所有页面/API 对外前缀统一为 `/apps/asset-hub`。
- **耗材模块路由前缀**：`/apps/asset-hub/{locale}/consumables`，当前仅支持 `zh`、`en`。
- **整体目标**：按三阶段方案**完整启用耗材模块**：
  - Phase 1：耗材基础数据与列表（MVP）。
  - Phase 2：耗材操作流程与库存联动。
  - Phase 3：耗材盘点、告警与审计报表。

截至本文件创建时，**三个阶段的主要工作均已落地并通过测试**。

---

### 二、数据库与模型现状（与耗材相关）

已在 `web/lib/db/schema.ts` 中落地并迁移，当前与耗材相关的核心表：

- **`consumable_categories`**：耗材类别（code、label_zh/label_en、unit 等）。
- **`consumables`**：
  - 核心字段：`status`（`in-stock` / `low-stock` / `out-of-stock` / `reserved` / `archived`）、`quantity`、`reserved_quantity`、`safety_stock`、`keeper`、`location`、`metadata`。
  - 通过服务端逻辑维护库存与状态，不允许出现负库存或“预留 > 库存”。
- **`consumable_operations`**：
  - 字段：`type`（`purchase` / `inbound` / `outbound` / `reserve` / `release` / `adjust` / `dispose`）、`status`（`pending` / `done` / `cancelled`）、`quantity_delta`、`reserved_delta`、`actor`、`description`、`metadata`。
  - 用于记录所有影响耗材库存/预留的业务操作。
- **`consumable_inventory_tasks` / `consumable_inventory_entries`**：
  - 任务：名称、范围过滤、owner、状态（`draft` 等）、说明。
  - 条目：按任务和耗材生成系统数量、实盘数量、差异（variance）及备注。
- **`asset_approval_requests` 扩展**：
  - 新增 `consumable_id`、`consumable_operation_id` 外键，用于把审批请求与耗材操作关联。
- **`consumable_alerts`**：
  - 字段：`level`（`low-stock` / `out-of-stock`）、`status`（`open` / `resolved`）、`quantity`、`reserved_quantity`、`message`、`external_todo_id` 等。
  - 记录低库存/缺货告警，支持与 DooTask 待办联动。

类型层面已补齐：

- `web/lib/types/consumable.ts`：`Consumable`、`ConsumableStatus` 等（含 `reservedQuantity`）。
- `web/lib/types/consumable-operation.ts`：
  - `ConsumableOperationType` / `ConsumableOperationStatus`；
  - `ConsumableOperationAuditEntry`（用于审计报表）。
- `web/lib/types/consumable-inventory.ts`：盘点任务与条目类型。
- `web/lib/types/consumable-alert.ts`：耗材告警实体及状态枚举。

---

### 三、仓储层与业务规则（Repository / Service）

#### 1. 耗材与库存

- `web/lib/repositories/consumables.ts`：
  - `listConsumables`：带搜索、状态、类别与分页的耗材列表。
  - `createConsumable` / `updateConsumable` / `deleteConsumable`：
    - 负责插入/更新/删除耗材基础信息。
    - 创建/更新/删除后会调用告警同步逻辑，自动根据库存与状态维护 `consumable_alerts`。
  - `getConsumableStockStats`：为 Dashboard / 列表提供耗材库存统计（total / inStock / lowStock / outOfStock / reserved / archived）。

核心规则：

- 状态计算由 `resolveStatusFromStock`（在 `consumable-operations.ts` 中）统一处理，基于：
  - `quantity`、`reserved_quantity`、`safety_stock`、当前 `status`。
  - 规则：`archived` 优先级最高；`quantity <= 0` → `out-of-stock`；`reserved >= quantity` → `reserved`；`quantity <= safety_stock` → `low-stock`；否则 `in-stock`。

#### 2. 耗材操作与审批联动

- `web/lib/repositories/consumable-operations.ts`：
  - CRUD：
    - `listOperationsForConsumable` / `getConsumableOperationById`。
    - `createConsumableOperation`：
      - 插入 `consumable_operations` 记录；
      - 若 `status === "done"`，执行 `applyOperationEffects`，更新耗材库存/预留与状态，并同步告警。
    - `updateConsumableOperationStatus`：
      - 从 `pending`→`done` 时执行 `applyOperationEffects`；
      - 已 `done` 的操作禁止回退。
  - 审计报表：
    - `queryConsumableOperations(query, options)`：
      - 支持按类型、状态、耗材、保管人、操作者、关键字、时间区间进行筛选；
      - 返回分页数据与汇总 `summary`（总记录数、待处理数量、入库量、出库量、净变化）。
    - 基于 `ConsumableOperationAuditEntry`，附带耗材名称、类别、状态、保管人与位置。

- `web/lib/repositories/approvals.ts`：
  - 已扩展以支持：
    - 审批请求与 `consumables` / `consumable_operations` 的关联；
    - 审批通过后，触发耗材操作的库存更新（通过 `applyConsumableApprovalSuccessEffects` 调用操作仓储逻辑）。

- `web/app/api/consumables/[id]/operations/route.ts`：
  - `GET`：按耗材 ID 拉取操作时间线。
  - `POST`：
    - 校验 `type` / `status` / `quantityDelta` / `reservedDelta`（`validateOperationDeltas`）。
    - 读取 `consumable-action-configs` 确定是否需要审批；
    - 若需要审批，则强制 `status=pending`；否则直接 `done` 并更新库存。

#### 3. 盘点任务与条目

- `web/lib/repositories/consumable-inventory.ts`：
  - `listConsumableInventoryTasks` / `getConsumableInventoryTaskById`。
  - `createConsumableInventoryTask`：根据当前耗材数据生成初始条目（系统数量），后续填写实盘数量与备注。
  - `updateConsumableInventoryTaskStatus`、`listConsumableInventoryEntries`、`createConsumableInventoryEntries`、`updateConsumableInventoryEntry`、`completeConsumableInventoryTask`。

#### 4. 低库存告警与 DooTask 待办

- `web/lib/repositories/consumable-alerts.ts`：
  - `syncConsumableAlertSnapshot`：
    - 输入为单个耗材库存快照（id/name/keeper/status/quantity/reservedQuantity）；
    - 当状态为 `low-stock` 或 `out-of-stock` 时：
      - 若已存在 `open` 告警 → 更新等级与文案；
      - 若不存在 → 创建新 `open` 告警；
    - 当状态恢复为正常（非 low/out）时 → 自动把相关告警 `resolved`。
  - `listConsumableAlerts`：按状态过滤（默认只查 `open`）。
  - `resolveConsumableAlertById` / `resolveAlertsForConsumable`：手动关闭告警。
  - `propagateConsumableAlertResult` / `propagateAlertResolution`：
    - 与 DooTask 待办联动：创建告警待办、在告警关闭时同步关闭外部待办。

- `web/lib/integrations/dootask-todos.ts`：
  - 针对告警新增：
    - `createConsumableAlertTodo(alert)`：在宿主创建 `type="consumable-alert"` 的待办；
    - `resolveConsumableAlertTodo(alert)`：将对应待办标记为已处理。
  - 使用 `appConfig.dootaskTodo` 中的 `baseUrl` / `token` / `linkBase`，可通过环境变量控制是否真正调用宿主 API。

---

### 四、API 端点与页面一览（耗材子域）

#### 1. 列表与基础数据（Phase 1）

- 页面：
  - `/{locale}/consumables`：耗材模块总览卡片（列表、操作审计、盘点、告警、设置）。
  - `/{locale}/consumables/list`：耗材列表，带筛选/分页与低库存提示。
  - `/{locale}/consumables/[id]`：单个耗材详情，含操作时间线与操作录入表单。
  - `/{locale}/consumables/settings`：耗材类别与基础配置（按后续需求扩展）。
- API：
  - `GET /apps/asset-hub/api/consumables`：耗材列表。
  - `POST /apps/asset-hub/api/consumables`：新建耗材。
  - 其他 CRUD、导入导出 API 已按资产模块风格补齐或预留。

#### 2. 操作流程与库存联动（Phase 2）

- 页面（详情页内嵌组件）：
  - `ConsumableOperationTimeline`：操作时间线。
  - `ConsumableOperationForm`：创建新操作，自动根据 `action-config` 判断是否需要审批并禁用相应选项。

- API：
  - `GET /apps/asset-hub/api/consumables/{id}/operations`：单耗材操作列表。
  - `POST /apps/asset-hub/api/consumables/{id}/operations`：创建操作（入库/出库/预留/释放/调整/处理），与审批配置联动。

#### 3. 盘点与告警（Phase 3）

- 页面：
  - `/{locale}/consumables/inventory`：盘点任务列表 + 创建弹窗。
  - `/{locale}/consumables/inventory/[id]`：盘点任务详情 + 条目表 + 状态控制。
  - `/{locale}/consumables/alerts`：耗材告警列表，可标记告警为已处理。

- API：
  - `GET /apps/asset-hub/api/consumables/inventory` / `POST`：盘点任务列表与创建。
  - `GET /apps/asset-hub/api/consumables/inventory/{id}` / `PUT` / `DELETE`：任务详情、更新与删除。
  - `GET /apps/asset-hub/api/consumables/alerts`：告警列表（默认 `status=open`）。
  - `PATCH /apps/asset-hub/api/consumables/alerts/{id}`：仅支持 `status="resolved"` 以关闭告警。

#### 4. 审计报表与导出（Phase 3：`consumable-audit`）

- 页面：
  - `/{locale}/consumables/operations`：
    - 支持条件筛选（类型/状态/关键字/耗材 ID/保管人/操作者/时间区间），展示耗材操作审计表；
    - 顶部卡片展示汇总 KPI（记录数、待处理数、入库量、出库量、净变化）；
    - 支持分页与 CSV 导出。

- API：
  - `GET /apps/asset-hub/api/consumables/operations`：
    - 使用 query 参数与 `buildConsumableOperationQuery` 解析条件；
    - 返回 `data`（`ConsumableOperationAuditEntry[]`）、`meta`（分页）、`summary`（汇总）。
  - `GET /apps/asset-hub/api/consumables/operations/export`：
    - 与上述查询参数保持一致；
    - 返回 CSV（含明细 + 汇总信息）。

---

### 五、测试情况

与耗材模块相关的关键单元测试全部通过（`pnpm vitest run`）：

- `web/tests/consumable-operations.test.ts`：
  - 校验入库/出库对库存与状态的影响；
  - 校验预留逻辑与非法扣减的抛错；
  - 校验 `queryConsumableOperations` 的过滤与汇总结果。
- `web/tests/consumable-inventory.test.ts`：
  - 覆盖盘点任务与条目的创建、更新、差异计算与状态流转。
- `web/tests/consumable-alerts.test.ts`：
  - 覆盖低库存/缺货告警的创建、升级、恢复与关闭逻辑。
- `web/tests/approvals.test.ts`：
  - 确认审批与资产/耗材操作间的联动，以及外部待办 ID 写入逻辑（`external_todo_id`）。

---

### 六、当前结论与下一步建议

**当前状态（耗材模块）：**

- Phase 1：基础数据、列表与导航入口已可用。
- Phase 2：耗材操作（入库/出库/预留/释放/调整/处理）与库存联动、审批集成已可用。
- Phase 3：
  - 盘点任务与执行记录：已实现。
  - 低库存告警通知 / DooTask 待办：已实现。
  - 耗材操作审计报表与导出：已实现。

**下一步可以考虑的方向（供 AI 参考择优推进）：**

1. **与资产模块的视图与报表统一**  
   - 在系统报表中心增加“耗材”维度切换，与资产报表共用筛选/导出 UI 风格。
2. **更丰富的 Dashboard 指标**  
   - 首页增加耗材相关 KPI（例如近 30 天耗材消耗 Top N、按类别分布等），复用现有报表 API。
3. **审批细节与模板优化**  
   - 在操作表单与审批详情中展示更丰富的耗材业务字段（项目、用途、归属等），对齐资产操作模板。
4. **导入/导出与批量操作增强**  
   - 为耗材列表增加 CSV 导入与批量更新能力，对齐资产模块的导入导出体验。

> 以后如果需要扩展耗材域的新能力（比如预算控制、供应商维度、耗材与资产关联等），**建议先在 `.cursor/rules` 中补充设计文档，再参考本文件中已有模式（表结构 + repository + API + 页面 + 测试）进行迭代。**


