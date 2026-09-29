# 拼豆预约前端：Vue3 落地页（构建）+ 静态服务 server.mjs（/api/* 反向代理到后端）

# ---- Vue 构建阶段 ----
# 用 node:22-slim（Debian）规避 Apple Silicon 上 alpine 的 npm “Exit handler never called” 问题
FROM node:22-slim AS web-build
WORKDIR /app
COPY web/package*.json ./web/
RUN cd web && npm install --no-audit --no-fund
COPY web ./web
# 旧的应用页面（/app、/action、/resources）需保留，随构建一起进入 public/
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
