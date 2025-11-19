## Asset Hub Web 应用

基于 Next.js App Router + TypeScript + Tailwind + shadcn/ui，用于提供 Asset Hub 插件的页面与 API。

## 环境变量

1. 复制 `env.example` 为 `.env.local`（或其他 `.env*` 文件），按需要修改：
   - `ASSET_HUB_DB_PATH`：SQLite 文件位置，默认 `./data/asset-hub.db`。
   - `ASSET_HUB_BASE_URL`：可选，用于在服务端生成绝对地址。
   - `DOOTASK_API_BASE_URL` / `DOOTASK_API_TOKEN`：后续与 DooTask 宿主交互时使用。
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

## 测试与校验

```bash
pnpm lint   # 代码规范检查
pnpm test   # Vitest 单元测试
```

## DooTask 宿主集成

- 通过 `lib/integrations/dootask-approvals.ts` 与 DooTask API 对接，在审批创建/完成时自动创建、更新宿主待办。
- 配置 `DOOTASK_API_BASE_URL`、`DOOTASK_API_TOKEN` 后即可启用；未配置时自动降级为本地日志。
- 待办链接会带上 `theme/lang/user_*` 等查询参数，便于在 DooTask 内部打开插件详情页。

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
