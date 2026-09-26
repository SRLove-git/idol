# syntax=docker/dockerfile:1.7

# ---- 构建阶段 ----
# 注意：node:22-alpine（musl）在 Apple Silicon aarch64 上 npm ci 会报
# “Exit handler never called!”，改用 Debian 系 node:22-slim 规避。
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund
COPY . .
# 容器内跳过类型检查编译（tsc --noCheck）：小配置服务器全量类型检查极慢（10-30 分钟甚至 OOM）
# 本地开发仍用 npm run build 保留完整类型检查
# 编译后精简出生产依赖（npm prune --omit=dev），避免与 deps stage 并行 npm ci 争抢缓存
RUN ./node_modules/.bin/tsc -p tsconfig.build.json --noCheck \
  && npm prune --omit=dev

# ---- 运行阶段 ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# 注：原 diy 镜像在此安装 ffmpeg，用于「视频作品 + 曲库配乐」混音；
# 拼豆预约流程（门店/预约/核销）不依赖它，且 Debian 的 ffmpeg 会拖入 400MB+ 依赖。
# 如需视频混音功能，再补上：
#   RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
#       && rm -rf /var/lib/apt/lists/*
# 运行依赖：直接复用 build stage 精简后的 node_modules
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# 曲库配乐与演示短视频资产（混音与演示数据需要）
COPY assets ./assets
# 聊天图片上传目录（compose 挂载持久卷 /app/uploads）
RUN mkdir -p /app/uploads
EXPOSE 3000
CMD ["node", "dist/main.js"]
