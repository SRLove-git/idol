# IDOL BEADS 统一响应式官网 + 静态服务 server.mjs（/api/* 反向代理到后端）

# ---- Vue 构建阶段 ----
# 用 node:22-slim（Debian）规避 Apple Silicon 上 alpine 的 npm “Exit handler never called” 问题
FROM node:22-slim AS web-build
WORKDIR /app
COPY web/package*.json ./web/
RUN cd web && npm install --no-audit --no-fund
COPY web ./web
# 复制管理后台等静态资源，官网由 Vue 构建输出覆盖到 public/
COPY public ./public
RUN cd web && npm run build

# ---- 运行阶段 ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY server.mjs ./
COPY --from=web-build /app/public ./public
EXPOSE 4173
CMD ["node", "server.mjs"]
