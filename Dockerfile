# 拼豆预约前端：纯 Node 静态服务 + /api/* 反向代理到后端
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# 无 npm 依赖，只需源码与静态资源
COPY package.json ./
COPY server.mjs ./
COPY public ./public

EXPOSE 4173

CMD ["node", "server.mjs"]
