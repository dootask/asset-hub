# 多阶段构建 Dockerfile

# ============================================
# Stage 1: 构建前端
# ============================================
FROM node:18-alpine AS ui-builder

WORKDIR /build/ui

# 复制前端依赖文件
COPY ui/package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制前端源代码
COPY ui/ ./

# 构建前端
RUN npm run build

# ============================================
# Stage 2: 构建后端
# ============================================
FROM node:18-alpine AS server-builder

WORKDIR /build/server

# 复制后端依赖文件
COPY server/package*.json ./

# 安装依赖（包括 devDependencies 用于编译 TypeScript）
RUN npm ci

# 复制后端源代码
COPY server/ ./

# 构建后端
RUN npm run build

# 删除 devDependencies
RUN npm prune --production

# ============================================
# Stage 3: 最终镜像
# ============================================
FROM node:18-alpine

# 安装 nginx 和其他必要工具
RUN apk add --no-cache nginx wget

# 创建应用目录
WORKDIR /app

# 创建必要的目录
RUN mkdir -p /app/ui /app/server /app/data /app/uploads /app/logs \
    && chown -R node:node /app \
    && mkdir -p /var/log/nginx \
    && chown -R node:node /var/log/nginx \
    && mkdir -p /var/lib/nginx/tmp \
    && chown -R node:node /var/lib/nginx

# 复制前端构建产物
COPY --from=ui-builder --chown=node:node /build/ui/dist /app/ui

# 复制后端构建产物和依赖
COPY --from=server-builder --chown=node:node /build/server/dist /app/server/dist
COPY --from=server-builder --chown=node:node /build/server/node_modules /app/server/node_modules
COPY --from=server-builder --chown=node:node /build/server/package*.json /app/server/

# 复制数据库迁移脚本
COPY --chown=node:node server/database /app/server/database

# 复制 nginx 配置
COPY --chown=node:node dootask-plugin/nginx.conf /etc/nginx/nginx.conf

# 复制启动脚本
COPY --chown=node:node <<'EOF' /app/start.sh
#!/bin/sh
set -e

echo "Starting Asset Management Plugin..."

# 初始化数据库
echo "Initializing database..."
cd /app/server
node dist/database/migrate.js

# 启动后端服务
echo "Starting API server..."
node dist/index.js &

# 等待后端服务启动
sleep 3

# 启动 nginx
echo "Starting nginx..."
nginx -g 'daemon off;' &

# 等待所有进程
wait
EOF

RUN chmod +x /app/start.sh

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# 使用非 root 用户运行（注意：nginx 需要 root 权限，这里需要调整）
# USER node

# 启动应用
CMD ["/app/start.sh"]
