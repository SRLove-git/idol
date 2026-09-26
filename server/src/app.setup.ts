import { INestApplication, ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import helmet from 'helmet';
import express, { type Express } from 'express';
import { join, resolve } from 'path';
import { uploadRoot } from './uploads/uploads.provider';

/** 解析 CORS_ORIGINS（逗号分隔的白名单）；未配置返回 null */
function corsOrigins(): string[] | null {
  const list = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : null;
}

/**
 * 应用级中间件/全局配置集中在此，bootstrap 与 e2e 测试共用：
 * WebSocket 适配器、静态资源、helmet 安全头、CORS 白名单、全局前缀与校验管道。
 */
export function configureApp(app: INestApplication): void {
  // 聊天 WebSocket（原生 ws，与 HTTP 共用端口，路径 /ws）
  app.useWebSocketAdapter(new WsAdapter(app));

  // 聊天图片等上传文件静态托管（UPLOAD_DIR 支持相对与绝对路径，统一用 uploadRoot() 计算）
  // 注意：path.join 遇绝对路径会拼出错误路径（如 /app/app/uploads），
  // 导致上传的图片 URL 全部 404，必须用 resolve 处理绝对路径。
  app.use('/uploads', express.static(resolve(process.cwd(), uploadRoot())));
  // 开发环境演示短视频与曲库音频（bootstrap 种子引用的真实资产）
  app.use(
    '/assets/demo',
    express.static(join(process.cwd(), 'assets', 'demo')),
  );
  app.use(
    '/assets/music',
    express.static(join(process.cwd(), 'assets', 'music')),
  );

  // 安全响应头：X-Content-Type-Options、X-Frame-Options、CSP 等
  app.use(helmet());

  // 管理后台（admin）与客户端共用同一套 /api 前缀 API
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // 反向代理（nginx）后正确识别客户端 IP：
  // 验证码防刷等按 IP 限流的逻辑依赖 req.ip，未配置时所有请求都取自代理地址，
  // 会导致全站共享同一个限流配额。仅在生产经 nginx 暴露时开启（TRUST_PROXY=true）。
  if (process.env.TRUST_PROXY === 'true') {
    // 按「内网网段」信任而非固定跳数：客户端流量可能经过 1 层（nginx-lb）
    // 或 2 层（admin nginx → nginx-lb）容器代理，固定跳数会取到内网容器 IP，
    // 导致所有用户共享同一限流配额（后台登录被误锁）。信任 loopback/linklocal/
    // 私有网段后，Express 从右往左剥离受信代理，取到第一个公网地址即真实客户端 IP。
    (app.getHttpAdapter().getInstance() as Express).set('trust proxy', [
      'loopback',
      'linklocal',
      'uniquelocal',
    ]);
  }

  const origins = corsOrigins();
  app.enableCors({
    // 配置 CORS_ORIGINS 时严格按白名单；生产未配置默认禁止跨域（原生 App 不受 CORS 限制）；
    // 开发未配置放行所有来源，便于本地联调
    origin: origins ?? (process.env.NODE_ENV === 'production' ? false : true),
    credentials: true,
  });
}
