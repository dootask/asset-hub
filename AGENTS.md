# 资产管理插件 - AI 开发指南

本文档为 AI Agent 提供项目的完整知识体系和开发指导。

## 📚 知识体系架构

本项目采用 **Graphiti 知识图谱 + Cursor Rules** 的双层知识管理架构：

### 🧠 Graphiti 知识图谱（动态业务知识）
- **Group ID**: `dootask-apps-asset-hub`
- **存储内容**：业务实体、流程规则、状态转换、权限规则
- **查询方式**：自然语言查询
- **适用场景**：
  - "资产借用的完整流程是什么？"
  - "哪些角色可以审批资产采购？"
  - "资产状态如何转换？"
  - "借用逾期的提醒机制是怎样的？"

#### Graphiti 中的核心知识

已建模的业务知识：
1. ✅ **项目概述**：技术栈、核心功能、多语言和主题支持
2. ✅ **资产实体**：属性定义、状态值、资产类型、生命周期
3. ✅ **操作流程**：10种操作类型（采购、入库、领用、借用、归还、派发、维修、报废、回收、遗失）
4. ✅ **审批规则**：三阶段流程、多级审批、审批通知
5. ✅ **角色权限**：5种系统角色、权限级别、数据权限
6. ✅ **五大模块**：首页、系统管理、资产管理、耗材管理（后期）、版本显示
7. ✅ **业务规则**：数据验证、状态转换、提醒规则

#### 如何查询 Graphiti

```typescript
// 示例：查询审批流程
const facts = await searchMemoryFacts({
  query: "资产采购需要经过哪些审批步骤？",
  group_ids: ["dootask-apps-asset-hub"],
  max_facts: 10
})

// 示例：搜索实体
const nodes = await searchNodes({
  query: "资产状态",
  group_ids: ["dootask-apps-asset-hub"],
  max_nodes: 10
})
```

### 📋 Cursor Rules（静态开发规范）
- **位置**: `.cursor/rules/`
- **存储内容**：技术规范、代码模板、工作流程、外部文档索引
- **应用方式**：自动应用或手动引用

#### 已创建的规则文件

| 文件 | 类型 | 说明 |
|------|------|------|
| `00-project-core.mdc` | Always | 项目核心信息、技术栈、核心约束 |
| `10-frontend-core.mdc` | Auto (ui/**) | 前端核心规范和架构 |
| `10-frontend-templates.mdc` | Agent Requested | 前端详细代码模板 |
| `11-backend-core.mdc` | Auto (server/**) | 后端核心规范和架构 |
| `11-backend-templates.mdc` | Agent Requested | 后端详细代码模板 |
| `12-plugin-core.mdc` | Auto (dootask-plugin/**) | 插件核心结构和配置 |
| `12-plugin-templates.mdc` | Agent Requested | 插件详细配置模板 |
| `20-business-domains.mdc` | Agent Requested | 业务领域知识（与 Graphiti 协作） |
| `30-workflow-templates.mdc` | Manual | 开发工作流程模板 |
| `99-external-references.mdc` | Agent Requested | 外部文档和示例索引 |

## 🎯 开发流程

### 第一步：理解需求
1. 查看 `00-project-core.mdc`（项目核心信息和约束）
2. 使用 Graphiti 查询相关业务规则
3. 参考 `20-business-domains.mdc`（业务领域知识）

### 第二步：设计实现
1. 查看对应的 Cursor Rules（前端/后端/插件）
2. 参考 `30-workflow-templates.mdc` 的标准流程
3. 如有疑问，查询 `99-external-references.mdc`

### 第三步：编码实现
1. 遵循 Cursor Rules 中的代码规范
2. 使用提供的代码模板
3. 实现过程中利用 Graphiti 查询业务细节

### 第四步：测试验证
1. 单元测试
2. 功能测试（多语言、主题、权限）
3. 集成测试（与 DooTask 主程序）

## 🔧 常见开发任务

### 创建新业务模块
👉 参考：`@30-workflow-templates.mdc` → "工作流1：创建新的业务模块"

### 添加新 API 接口
👉 参考：`@30-workflow-templates.mdc` → "工作流2：添加新的 API 接口"

### 实现审批流程
👉 参考：
- Graphiti 查询："审批流程规则"
- `@30-workflow-templates.mdc` → "工作流3：实现审批流程"

### 发布新版本
👉 参考：
- `@30-workflow-templates.mdc` → "工作流4：发布新版本"
- `@12-plugin-core.mdc` → "插件版本管理"

## 📖 重要参考文档

### 外部文档（已深度学习）
- ✅ DooTask 插件开发文档：`/home/coder/workspaces/appstore/appstore/apps/_/README.md`
- ✅ @dootask/tools 工具库：`/home/coder/workspaces/tools/README.md`
- ✅ MCP 插件示例：`/home/coder/workspaces/mcp/`

### 项目文档
- 📘 `AGENTS.md`（本文档）：AI 开发指南
- 📘 `.cursor/rules/`：技术规范和模板（完整的项目知识）
- 📘 `00-project-overview.mdc`：项目概览（项目决策基准）

## 🚀 快速开始

### 查询业务规则
使用 Graphiti 自然语言查询业务规则，例如：
- "资产借用逾期了怎么办？"
- "哪些角色可以审批资产采购？"
- "资产状态如何转换？"

### 编写代码
遵循对应的 Cursor Rules：
- 前端代码 → `10-frontend-core.mdc`（自动应用）
- 后端代码 → `11-backend-core.mdc`（自动应用）
- 插件配置 → `12-plugin-core.mdc`（自动应用）

## 🎓 学习路径

### 对于新加入的 AI Agent

1. **第1步**：阅读本文档（`AGENTS.md`）
2. **第2步**：阅读项目核心（`00-project-core.mdc`）
3. **第3步**：浏览核心规范（3个 core 文件会自动应用）
4. **第4步**：测试 Graphiti 查询（问几个业务问题）
5. **第5步**：参考示例代码（`/home/coder/workspaces/mcp/`）
6. **第6步**：开始编码！

### 建议学习顺序

```
1. 项目核心 (00-project-core.mdc)
   ↓
2. 业务领域 (20-business-domains.mdc) + Graphiti 查询
   ↓
3. 前端核心 (10-frontend-core.mdc) + 模板 (按需)
   ↓
4. 后端核心 (11-backend-core.mdc) + 模板 (按需)
   ↓
5. 插件核心 (12-plugin-core.mdc) + 模板 (按需)
   ↓
6. 工作流程 (30-workflow-templates.mdc)
   ↓
7. 开始开发！
```

## 💡 最佳实践

### DO ✅
- 始终遵循 Cursor Rules 中的项目规范和约束
- 使用 Graphiti 查询动态业务规则
- 参考 `00-project-overview.mdc` 了解核心决策
- 复用已有的代码模板和工作流程
- 使用 @dootask/tools 集成 DooTask
- 保持代码的类型安全（TypeScript）
- 所有操作都要有错误处理
- 支持多语言和深色主题

### DON'T ❌
- 不要偏离 Cursor Rules 中定义的规范
- 不要忽略项目概览中的核心约束
- 不要直接解析 URL 参数（用 @dootask/tools）
- 不要使用 class 组件（用函数组件）
- 不要跳过审批流程
- 不要忽略权限检查
- 不要硬编码文本（用多语言）
- 不要遗漏日志记录

## 🔍 快速索引

| 需求 | 查看文档 |
|------|---------|
| 不知道业务规则 | 使用 Graphiti 自然语言查询 |
| 不确定代码怎么写 | 对应的 Cursor Rules（自动应用） |
| DooTask 集成问题 | `99-external-references.mdc` |
| 创建新模块 | `30-workflow-templates.mdc` → 工作流1 |
| 添加新 API | `30-workflow-templates.mdc` → 工作流2 |
| 实现审批流程 | `30-workflow-templates.mdc` → 工作流3 |
| 发布新版本 | `30-workflow-templates.mdc` → 工作流4 |

## 📊 项目状态

### 已完成 ✅
- [x] Cursor Rules 规范（10个文件，薄层优化）
- [x] Graphiti 知识建模（group_id: dootask-apps-asset-hub）
- [x] 知识体系建立完毕

### 待开发 🚧
- [ ] 初始化前端项目（ui/）
- [ ] 初始化后端项目（server/）
- [ ] 配置插件结构（dootask-plugin/）
- [ ] 实现首页模块
- [ ] 实现系统管理模块
- [ ] 实现资产管理模块
- [ ] 实现耗材管理模块（后期）
- [ ] 容器化部署配置

## 🤝 协作建议

### 对于 AI Agent
- 每次开发新功能前，先查询 Graphiti 确认业务规则
- 遵循 Cursor Rules，保持代码一致性
- 遇到不确定的地方，主动查阅参考文档
- 提交代码前检查 ESLint 和 TypeScript 错误

### 对于人类开发者
- 更新需求时，同步更新 Cursor Rules 和 Graphiti
- 发现规范问题时，更新对应的规则文件
- 重要的技术决策添加到 `00-project-core.mdc`
- 保持文档和代码的同步更新

## 📞 技术支持

### 文档位置
- AI 指南：`AGENTS.md`（本文档）
- 项目核心：`00-project-core.mdc`（核心约束）
- 代码规范：`.cursor/rules/`（10个规则文件）
- 业务知识：Graphiti（group_id: `dootask-apps-asset-hub`）

### 外部资源
- DooTask 官网：https://www.dootask.com
- DooTask GitHub：https://github.com/kuaifan/dootask
- DooTask App Store：https://appstore.dootask.com/

---

**重要提醒**：本文档是为 AI Agent 准备的开发指南。所有开发决策都应该：
1. 遵循 Cursor Rules（核心规范自动应用，详细模板按需查阅）
2. 参考 `00-project-core.mdc` 了解核心约束
3. 利用 Graphiti 查询动态业务规则
4. 参考外部文档和示例代码

祝开发顺利！🎉

