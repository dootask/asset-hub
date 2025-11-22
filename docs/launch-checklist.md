# Asset Hub 上线前检查清单

> 目标：确保插件在 DooTask 宿主环境可稳定运行，管理员/运维有明确操作指引。

## 1. 环境与配置

1. 复制 `web/env.example` → `.env.production`（或宿主支持的方式），至少配置：
   - `ASSET_HUB_DB_PATH`
   - `ASSET_HUB_BASE_URL`（对外可访问的 https 地址）
   - `ASSET_HUB_ADMIN_USER_IDS`（逗号分隔的宿主用户 ID，具备后台权限）
   - `DOOTASK_TODO_BASE_URL` / `DOOTASK_TODO_TOKEN` / `DOOTASK_TODO_LINK_BASE`
2. 确认宿主代理/反向代理允许访问 `/apps/asset-hub/**`。

## 2. 数据库

1. 在服务器上执行：
   ```bash
   cd web
   pnpm install
   pnpm migrate
   ```
   - 新版本需要 `system_settings`、`asset_borrow_records` 表。
2. 记录 SQLite 正式文件位置，设置定期备份策略（包含 `.db/.db-wal/.db-shm`）。

## 3. 冒烟测试

建议在 DooTask 测试环境执行一遍：

1. 资产流程：新建资产 → 发起采购审批 → 审批通过 → 自动生成入库 → 入库完成。
2. 借用流程：借出资产（提交审批/操作）→ 归还并确认状态 → `/api/assets/borrows/overdue` 无遗留。
3. 耗材：创建耗材 → 手动触发低库存 → 告警开关开启/关闭 → 确认待办推送逻辑。
4. 报表：系统报表与自定义报表创建、预览、导出 CSV。
5. Alert Settings 页面：切换开关后，`/api/system/settings/alerts` 返回值及时更新。

## 4. 借用逾期提醒

1. 参考 `docs/borrow-overdue-reminder.md` 设置一个 Cron（或宿主任务）定期访问
   `/apps/asset-hub/api/assets/borrows/overdue` 并通知管理员。
2. 将 Cron 记录纳入运维手册。

## 5. 监控与日志

1. 服务器启用日志采集，重点关注：
   - `dootask-todos` 集成失败日志；
   - 告警/审批接口报错。
2. 可选：将 `/apps/asset-hub/api/health` 接入监控探针。

## 6. 发布

1. 更新 `.env` 中的 `ASSET_HUB_VERSION`、`ASSET_HUB_RELEASED_AT` 等信息。
2. 在仓库根目录更新 `RELEASE_NOTES.md` 并标记本次版本号。
3. 打 tag / 提交 PR → 发布至插件市场或宿主。


