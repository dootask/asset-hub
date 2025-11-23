# Asset Hub Release Notes

## v0.9.0 (准备上线)

### 核心亮点

- **资产全流程**：支持采购 → 审批 → 入库 → 领用/借用/归还 → 报废，配套操作时间线与审批详情。
- **耗材模块**：库存、操作、盘点、告警、审计报表、导入导出均可用。
- **审批中心**：统一的审批列表、详情、配置页，可按操作类型设置是否需要审批及默认审批人。
- **Dashboard & 报表**：首页 KPI、操作/审批趋势，系统报表与自定义报表（支持保存、预览、导出）。
- **借用逾期追踪**：新增 `asset_borrow_records`，提供 `/api/assets/borrows/overdue` 供定时提醒使用。
- **告警配置**：系统页新增 Alert Settings，可开关低库存告警与 DooTask 推送。

### 管理员须知

1. **环境变量**：部署前配置数据库路径、宿主访问地址、审批管理员 ID、DooTask Todo API 凭证。
2. **数据库迁移**：执行 `pnpm migrate` 以建立最新表结构（含 `system_settings`、`asset_borrow_records`）。
3. **告警开关**：`/system/alerts` 页面负责低库存告警生效与否，关闭后仅停止新告警，不会删除历史记录。
4. **借用提醒**：
   - 使用 `/api/assets/borrows/overdue` 拉取逾期列表，可结合 Cron 触发通知。
   - 具体方案见 `docs/borrow-overdue-reminder.md`。
5. **发布步骤**：详见 `docs/launch-checklist.md`。

### 已知限制

- 借用逾期提醒依赖外部定时任务；目前不会自动发送站内消息。
- 权限控制以 DooTask 注入的用户上下文为准，未实现细粒度角色策略。
- 审批/告警推送默认调用 DooTask Todo API，如未配置凭据会自动降级为日志输出。


