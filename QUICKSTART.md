# 快速开始指南

## 准备工作

确保您的系统已安装：
- Node.js >= 18
- npm 或 yarn
- Git

## 1. 克隆项目

```bash
git clone <repository-url>
cd asset-management-plugin
```

## 2. 初始化数据库

```bash
cd server
npm install
npm run migrate  # 创建数据库表
npm run seed     # 填充初始数据
```

这将创建：
- 1个总公司
- 3个部门（技术部、行政部、财务部）
- 1个管理员用户（username: admin）
- 5个系统角色（超级管理员、资产管理员、耗材管理员、审批人、普通用户）
- 20个权限
- 3个资产分类
- 2个耗材分类
- 系统设置

## 3. 启动后端服务

```bash
# 确保在 server 目录下
npm run dev
```

服务将在 http://localhost:3000 启动

测试健康检查：
```bash
curl http://localhost:3000/health
```

## 4. 启动前端服务

打开新的终端窗口：

```bash
cd ui
npm install
npm run dev
```

前端将在 http://localhost:5173 启动

## 5. 访问应用

打开浏览器访问 http://localhost:5173

## API 测试示例

### 获取公司列表
```bash
curl http://localhost:3000/api/system/companies
```

### 获取资产列表
```bash
curl http://localhost:3000/api/assets?page=1&pageSize=20
```

### 获取仪表板数据
```bash
curl http://localhost:3000/api/dashboard
```

### 创建资产
```bash
curl -X POST http://localhost:3000/api/assets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MacBook Pro",
    "code": "AST001",
    "category_id": 1,
    "company_id": 1,
    "purchase_price": 15000,
    "brand": "Apple",
    "model": "M2 Pro",
    "serial_number": "C02XQ0P0JG5H"
  }'
```

## 目录结构

```
.
├── server/                 # 后端服务
│   ├── src/
│   │   ├── controllers/   # 控制器
│   │   ├── services/      # 业务逻辑
│   │   ├── routes/        # 路由
│   │   └── database/      # 数据库
│   └── data/              # SQLite 数据库文件
├── ui/                     # 前端应用
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── pages/         # 页面
│   │   └── api/           # API 客户端
│   └── dist/              # 构建输出
└── dootask-plugin/        # DooTask 插件配置
```

## 常见问题

### 1. 数据库文件在哪里？
数据库文件位于 `server/data/asset_management.db`

### 2. 如何重置数据库？
```bash
cd server
rm -rf data/
npm run migrate
npm run seed
```

### 3. 端口被占用怎么办？
修改环境变量：
```bash
# 后端
export PORT=3001

# 前端
# 修改 ui/vite.config.ts 中的 server.port
```

### 4. TypeScript 编译错误
```bash
# 后端
cd server
npm run build

# 前端
cd ui
npm run build
```

## 下一步

- 查看 [API 文档](./docs/api.md)
- 阅读 [开发指南](./docs/development.md)
- 了解 [数据库设计](./docs/database.md)

## 需要帮助？

- 查看 [PROJECT_STATUS.md](./PROJECT_STATUS.md) 了解项目进度
- 查看 [.plan.md](./.plan.md) 了解完整开发计划
- 提交 Issue 到 GitHub

---

祝您使用愉快！🎉
