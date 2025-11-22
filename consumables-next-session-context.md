## Asset Hub / 耗材模块 - 下一会话 AI 上下文摘要

> 用法：下次新开 AI 会话时，先把本文件全文贴给 AI，再补充你当下的具体问题或需求。

---

### 一、项目与模块定位

- **项目**：Asset Hub，是 DooTask 的资产管理插件，所有页面与 API 前缀为 `/apps/asset-hub`。  
- **耗材模块前缀**：`/apps/asset-hub/{locale}/consumables`，目前 locale 支持 `zh`、`en`。  
- **技术栈**：Next.js App Router + TypeScript + SQLite（只在服务端访问）、shadcn/ui。  
- 更详细的耗材模块说明见仓库根目录：`consumables-module-status.md`（长版文档，包含数据表、仓储、API 和测试细节）。

---

### 二、耗材模块当前完成情况（Phase 1–3）

- **Phase 1：基础数据与列表**
  - 已有 `consumable_categories` / `consumables` 表与对应仓储。
  - 页面：
    - `/{locale}/consumables`：模块总览多卡片入口。
    - `/{locale}/consumables/list`：耗材列表（搜索、状态/类别筛选、分页）、低库存提示。
    - `/{locale}/consumables/[id]`：单耗材详情（基本信息）。
- **Phase 2：操作流程与库存联动**
  - 已有 `consumable_operations` 表，类型包括 `purchase` / `inbound` / `outbound` / `reserve` / `release` / `adjust` / `dispose`。  
  - 通过 `createConsumableOperation` + `updateConsumableOperationStatus` 驱动库存与状态更新，统一使用 `resolveStatusFromStock` 判定 `in-stock` / `low-stock` / `out-of-stock` / `reserved` / `archived`。  
  - 与审批系统打通：`asset_approval_requests` 已支持 `consumable_id`、`consumable_operation_id`，审批通过后会真正写入库存。  
  - 页面：
    - `/{locale}/consumables/[id]` 中集成操作时间线与操作创建表单，按 `action-config` 决定是否需要审批。
- **Phase 3：盘点、告警与审计**
  - **盘点**：
    - 表：`consumable_inventory_tasks` / `consumable_inventory_entries`，支持任务范围、owner、状态与实盘差异记录。
    - 页面：
      - `/{locale}/consumables/inventory`：盘点任务列表 + 创建弹窗。
      - `/{locale}/consumables/inventory/[id]`：任务详情、条目表（系统数量/实盘/差异）、状态操作（开始/完成）。  
  - **告警**：
    - 表：`consumable_alerts`，记录 `low-stock` / `out-of-stock` 告警及其 DooTask 待办 ID。
    - 仓储会在耗材创建/更新/删除以及操作生效时，根据当前库存快照自动创建/更新/关闭告警。
    - 页面：`/{locale}/consumables/alerts` 显示 open 告警，可手动标记为已处理。
    - 与 DooTask 待办集成：新告警会创建宿主待办，告警关闭时同步关闭对应待办（由环境变量控制是否真实调用宿主 API）。  
  - **审计报表**：
    - 在仓储中通过 `queryConsumableOperations` 实现多维过滤和汇总统计（类型/状态/关键词/时间段/保管人/操作者/耗材 ID），提供总记录数、待处理记录数、入库量、出库量与净变化。  
    - 页面：`/{locale}/consumables/operations` 提供完整的审计视图（过滤表单 + 摘要卡片 + 列表 + 分页 + 导出）。  
    - API：
      - `GET /apps/asset-hub/api/consumables/operations`：JSON 报表。
      - `GET /apps/asset-hub/api/consumables/operations/export`：CSV 导出（含明细与汇总）。

所有与耗材相关的核心单元测试（操作、盘点、告警、审批联动）当前均通过。

---

### 三、下一阶段（Phase 4）推荐方向（供 AI 参考规划与落地）

> 下面是已经讨论过、但尚未实施的“下一阶段”方向，AI 可以在此基础上帮忙细化设计和拆解任务。

1. **成本与供应链维度**
   - 为耗材和操作补充成本字段（单价、总价）与供应商信息（可先存字符串或简单 code），复用 `metadata` 但给出明确字段约定。  
   - 新增“耗材成本概览”报表 API（按时间段/类别/供应商统计），并在 Dashboard 增加“近 30 天耗材支出”等 KPI。

2. **与资产报表中心对齐**
   - 扩展现有报表接口以支持 `scope = asset | consumable | both`。  
   - 在系统 `data/reports` 页面中增加“耗材”视图，让管理者可以在同一报表中心切换资产/耗材。  

3. **告警策略与配置化**
   - 在系统管理中增加简单的“告警配置”页面（比如 `/system/alerts` 或复用 `/system/approval` 结构）。  
   - 支持按类别/保管人/位置配置是否启用告警、默认通知人/审批人等；现有告警逻辑可读取此配置决定是否创建告警与待办。  

4. **导入 / 批量操作体验**
   - 为耗材增加标准化的导入/导出页面（类似资产的 `/assets/import-export`），支持批量初始化和更新耗材数据。  
   - 可考虑提供管理员专用的“批量库存调整”入口（例如把盘点结果一键写回耗材数量）。  

---

### 四、给下一次 AI 的提示（你可以直接附在问题后面）

当你下次新开一个会话时，可以这样对 AI 说（示例）：

> 请先阅读我提供的 `consumables-next-session-context.md` 和 `consumables-module-status.md` 内容，完全理解当前耗材模块的实现状态后，再帮我完成下面的任务：  
> 1）根据 Phase 4“成本与供应链维度”的方向，设计详细的表结构和接口方案；  
> 2）给出一个可以直接在本仓库中落地的实现计划，并按文件粒度拆分修改点。  

你也可以把“下面的任务”替换为：  
- “帮我把告警策略配置做成一个最小可用版本（MVP）”；  
- “帮我在报表中心中增加一个耗材 Tab”；  
- “帮我设计耗材导入流程的字段和校验规则”等。  


