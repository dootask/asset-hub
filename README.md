## Asset Hub 资产管理插件

- 本仓库用于开发 DooTask 的资产管理插件 **Asset Hub**，提供资产全生命周期管理能力（系统管理、资产管理、后期扩展的耗材管理等）。
- Web 应用基于 **Next.js + React + TypeScript + Tailwind CSS + shadcn/ui**，位于 `web/` 目录。
- 插件适配层基于 DooTask 插件规范，位于 `dootask-plugin/` 目录。

开发时的重要规则与约束，已整理在 `.cursor/rules/*.mdc` 中：

- `00-project-overview.mdc`：项目整体说明与关键约束。
- `10-dootask-plugin.mdc`：插件适配层职责。
- `20-web.mdc` / `21-web-routing.mdc`：Web 应用的角色、约束与路由规划。
- `30-feature-plan.mdc`：功能需求规划（首页、系统管理、资产管理等）。

## 开发流程

```bash
cd web
pnpm install
pnpm migrate   # 初始化 SQLite 与示例数据
pnpm dev       # http://localhost:3000/apps/asset-hub
```

## 质量保障

- `pnpm lint`：ESLint + TypeScript 检查。
- `pnpm test`：Vitest 单元测试（主要覆盖仓储层）。
- `Dockerfile`：构建生产镜像 `docker build -t asset-hub .`。
- `.github/workflows/ci.yml`：GitHub Actions 自动执行 lint/test/build，保证 PR 的基础质量。

## DooTask 插件

- `dootask-plugin/config.yml`：插件元数据。
- `dootask-plugin/1.0.0/config.yml`：菜单入口，iframe 链接已经附带 `theme/lang/user_id/user_token` 占位符。
- `dootask-plugin/README.md`：在 DooTask 侧接入的操作说明。


