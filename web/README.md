## Asset Hub Web 应用

基于 Next.js App Router + TypeScript + Tailwind + shadcn/ui，用于提供 Asset Hub 插件的页面与 API。

## 环境变量

1. 复制 `env.example` 为 `.env.local`（或其他 `.env*` 文件），按需要修改：
   - `ASSET_HUB_DB_PATH`：SQLite 文件位置，默认 `./data/asset-hub.db`。
   - `ASSET_HUB_BASE_URL`：可选，用于在服务端生成绝对地址。
   - `ASSET_HUB_ADMIN_USER_IDS` / `ASSET_HUB_APPROVER_USER_IDS`：逗号分隔的宿主用户 ID，分别用于声明“系统/资产管理员”与“审批人”白名单。
2. `.env*` 文件已被 `.gitignore` 忽略，避免泄露敏感信息。

## 数据库迁移

SQLite 结构和示例数据通过脚本管理：

```bash
pnpm install
pnpm migrate
```

脚本会自动创建 `assets / companies / roles` 等表，并写入示例数据。

## 本地开发

```bash
pnpm dev
# 访问 http://localhost:3000/apps/asset-hub/zh
```

### 重要页面

- `/apps/asset-hub/{locale}`：首页。
- `/apps/asset-hub/{locale}/assets/list`：资产列表。
- `/apps/asset-hub/{locale}/assets/[id]`：资产详情，支持基础信息弹窗编辑、操作时间线、审批入口。
- `/apps/asset-hub/{locale}/system`：系统管理总览 → 公司 / 角色 / 审批配置。
- `/apps/asset-hub/{locale}/system/alerts`：告警配置页，可启用/停用耗材低库存告警与 DooTask 待办推送。
- `/apps/asset-hub/api/assets/borrows/overdue`：列出已超过计划归还日期但尚未归还的借用记录，供提醒或自动化任务使用。
- 运营指南：参阅仓库根目录 `RELEASE_NOTES.md`、`docs/launch-checklist.md`、`docs/borrow-overdue-reminder.md`。

## 测试与校验

```bash
pnpm lint   # 代码规范检查
pnpm test   # Vitest 单元测试
pnpm test:e2e    # Playwright 端到端测试（需要 DooTask 宿主配置）
```

Playwright 依赖 DooTask 宿主提供 iframe 测试入口，请在 `web/.env` 中配置：

```
PLAYWRIGHT_DOOTASK_HOST=https://dootask.example.com
PLAYWRIGHT_APP_URL=https://asset-hub.example.com/apps/asset-hub
PLAYWRIGHT_USER_ID=demo-user
PLAYWRIGHT_USER_TOKEN=demo-token
```

`pnpm test:e2e` 会访问 `{host}/single/apps/iframe-test?url=...&userid=...&token=...`，等待 `iframe.micro-app-iframe-container` 加载后再执行用例，因此不需要、也不会启动本地 `pnpm dev`。

## DooTask 宿主集成

- `@dootask/tools` 由 `components/providers/DooTaskBridge.tsx` 统一初始化，将宿主注入的用户上下文缓存到浏览器 `sessionStorage`，供审批/资产表单复用。
- 前端在完成审批、通知等业务动作时，应通过 `@dootask/tools` 暴露的接口与宿主进行通信（例如创建/完成待办、推送通知），不再需要服务器端调用宿主 API。
- 审批创建/状态更新后，前端会在宿主内调用 `requestAPI("dialog/msg/sendbot")` 发送 `approval-alert` Bot 消息，提醒内容直接提示“请在应用中心查看”，不再附带外部链接；当检测到不在 DooTask 宿主环境时会自动跳过。
- `ASSET_HUB_ADMIN_USER_IDS`（逗号分隔）用于定义系统/资产管理员，可访问 `/system/**`、管理公司/角色/审批配置并拥有审批一切的权限；`ASSET_HUB_APPROVER_USER_IDS` 可额外指定只具备审批权限的用户，其它用户仅能处理与自己相关的申请。
- 审批默认策略由 `asset_action_configs` 表驱动，可在系统页的“审批配置”中调整是否需要审批、默认审批人以及是否允许发起人覆盖。

## Docker 部署

根目录的 `Dockerfile` 将自动构建 Next.js 生产镜像：

```bash
docker build -t asset-hub .
docker run -p 3000:3000 asset-hub
```

容器启动后对外暴露 `http://localhost:3000/apps/asset-hub/{locale}`，其中 `locale` 当前支持 `zh`、`en`。

## 重要目录

- `app/`：页面与 API Route Handler。
- `components/`：共享 UI 与布局组件。
- `lib/`：配置、数据库封装、仓储层、类型定义。
- `scripts/`：运维脚本（例如迁移）。
