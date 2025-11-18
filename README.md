## Asset Hub 资产管理插件

- 本仓库用于开发 DooTask 的资产管理插件 **Asset Hub**，提供资产全生命周期管理能力（系统管理、资产管理、后期扩展的耗材管理等）。
- Web 应用基于 **Next.js + React + TypeScript + Tailwind CSS + shadcn/ui**，位于 `web/` 目录。
- 插件适配层基于 DooTask 插件规范，位于 `dootask-plugin/` 目录。

开发时的重要规则与约束，已整理在 `.cursor/rules/*.mdc` 中：

- `00-project-overview.mdc`：项目整体说明与关键约束。
- `10-dootask-plugin.mdc`：插件适配层职责。
- `20-web.mdc` / `21-web-routing.mdc`：Web 应用的角色、约束与路由规划。
- `30-feature-plan.mdc`：功能需求规划（首页、系统管理、资产管理等）。


