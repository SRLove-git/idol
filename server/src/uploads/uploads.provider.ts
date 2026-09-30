import type { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import {
  copyFileSync,
  createReadStream,
  mkdirSync,
  renameSync,
  unlinkSync,
} from 'fs';
import { join } from 'path';

/** 上传结果 */
export interface UploadedFile {
  /** 可访问的相对或绝对 URL */
  url: string;
}

/** 存储提供者抽象：新增存储后端只需实现并注册此接口 */
export interface UploadProvider {
  readonly name: string;
  save(file: Express.Multer.File, dir: string): Promise<UploadedFile>;
  /** 删除已上传的媒体对象（传入 save 返回的 URL；非本存储的 URL 静默跳过） */
  delete(url: string): Promise<void>;
}

/** 上传提供者 DI token */
export const UPLOAD_PROVIDER = 'UPLOAD_PROVIDER';

/** 上传根目录（UPLOAD_DIR 环境变量，默认 uploads，相对进程工作目录） */
export function uploadRoot(): string {
  return process.env.UPLOAD_DIR ?? 'uploads';
}

/**
 * 本地磁盘存储：multer 已把文件写入临时目录，此处移动到 {UPLOAD_DIR}/{dir}/ 并返回
 * 相对 URL（静态资源由 main.ts 以 /uploads 前缀托管）。
 */
export class LocalUploadProvider implements UploadProvider {
  readonly name = 'local';

  save(file: Express.Multer.File, dir: string): Promise<UploadedFile> {
    const targetDir = join(uploadRoot(), dir);
    mkdirSync(targetDir, { recursive: true });
    const dest = join(targetDir, file.filename);
    try {
      renameSync(file.path, dest);
    } catch {
      // 跨设备/文件系统时回退为复制后删除临时文件
      copyFileSync(file.path, dest);
      unlinkSync(file.path);
    }
    return Promise.resolve({ url: `/uploads/${dir}/${file.filename}` });
  }

  delete(url: string): Promise<void> {
    // 演示/第三方资源不在本地上传目录，跳过
    if (!url.startsWith('/uploads/')) return Promise.resolve();
    const rel = url.slice('/uploads/'.length);
    const file = join(uploadRoot(), rel);
    try {
      unlinkSync(file);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw err; // 文件不存在视为已删除
    }
    return Promise.resolve();
  }
}

/**
 * S3 兼容对象存储（阿里云 OSS / AWS S3 / MinIO 等）。
 *
 * 配置（.env）：
 *   UPLOAD_PROVIDER=s3
 *   S3_ENDPOINT          可选：自定义终端（OSS/MinIO 需要）
 *   S3_REGION            默认 us-east-1
 *   S3_BUCKET            必填
 *   S3_ACCESS_KEY / S3_SECRET_KEY
 *   S3_PUBLIC_URL_BASE   可选：对外访问域名/CDN（如 https://cdn.example.com），
 *                        未配置时回退到 bucket 默认域名
 *   S3_FORCE_PATH_STYLE  可选：MinIO 等需要 true
 */
export class S3UploadProvider implements UploadProvider {
  readonly name = 's3';
  private readonly logger = new Logger(S3UploadProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;
  private readonly fallbackHost: string;
  private readonly endpointBase: string;
  private readonly forcePathStyle: boolean;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET', '');
    if (!this.bucket) {
      throw new Error('UPLOAD_PROVIDER=s3 时需配置 S3_BUCKET');
    }
    const region = config.get<string>('S3_REGION', 'us-east-1');
    this.publicBase = (
      config.get<string>('S3_PUBLIC_URL_BASE', '') ?? ''
    ).replace(/\/+$/, '');
    this.fallbackHost = `https://${this.bucket}.s3.${region}.amazonaws.com`;
    this.endpointBase = (config.get<string>('S3_ENDPOINT') ?? '').replace(
      /\/+$/,
      '',
    );
    this.forcePathStyle = config.get<string>('S3_FORCE_PATH_STYLE') === 'true';
    this.client = new S3Client({
      region,
      endpoint: this.endpointBase || undefined,
      forcePathStyle: this.forcePathStyle,
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY', ''),
        secretAccessKey: config.get<string>('S3_SECRET_KEY', ''),
      },
    });
  }

  async save(file: Express.Multer.File, dir: string): Promise<UploadedFile> {
    const key = `${dir}/${file.filename}`;
    try {
      // 流式上传：小文件单次 PUT，大文件（如短视频）自动转分片并发上传，
      // 避免把整个文件读进内存打爆服务端
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: createReadStream(file.path),
          ContentType: file.mimetype || 'application/octet-stream',
        },
        queueSize: 4,
        partSize: 8 * 1024 * 1024,
      });
      await upload.done();
    } finally {
      // 上传完成（无论成败）清理 multer 临时文件
      try {
        unlinkSync(file.path);
      } catch {
        /* 忽略清理失败 */
      }
    }
    const base = this.resolveBase();
    return { url: `${base}/${key}` };
  }

  /**
   * 对外 URL 前缀：
   * 1) 配置了 S3_PUBLIC_URL_BASE（CDN）优先使用；
   * 2) 配置了 S3_ENDPOINT（OSS/MinIO 直连）时按 path-style/virtual-host 拼 bucket 域名；
   * 3) 否则回退 AWS 默认 bucket 域名。
   */
  private resolveBase(): string {
    if (this.publicBase) return this.publicBase;
    if (this.endpointBase) {
      try {
        const ep = new URL(this.endpointBase);
        if (this.forcePathStyle) return `${this.endpointBase}/${this.bucket}`;
        return `${ep.protocol}//${this.bucket}.${ep.host}`;
      } catch {
        /* endpoint 解析失败时回退默认域名 */
      }
    }
    return this.fallbackHost;
  }

  async delete(url: string): Promise<void> {
    const key = this.urlToKey(url);
    if (!key) return;
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      this.logger.warn(`删除对象失败 key=${key}: ${(err as Error).message}`);
    }
  }

  /** 把存储生成的 URL 还原为对象 key；非本存储的 URL 返回 null（跳过） */
  private urlToKey(url: string): string | null {
    const target = url.trim();
    if (!/^https?:\/\//i.test(target)) return null;

    // 虚拟主机风格：publicBase（CDN）/ bucket 默认域名
    const bases = [this.publicBase, this.fallbackHost].filter(Boolean);
    for (const base of bases) {
      if (target.startsWith(`${base}/`)) {
        return target.slice(base.length + 1);
      }
    }

    // endpoint 直连（OSS / MinIO）：path-style / virtual-host 两种 URL 都能还原
    if (this.endpointBase) {
      try {
        const u = new URL(target);
        const ep = new URL(this.endpointBase);
        // path-style：https://endpoint/{bucket}/{key}
        if (u.origin === ep.origin) {
          const prefix = `/${this.bucket}/`;
          if (u.pathname.startsWith(prefix)) {
            return u.pathname.slice(prefix.length);
          }
          // endpoint 直连（key 即完整路径，如已迁移的旧 URL）
          if (u.pathname !== '/') {
            return u.pathname.replace(/^\//, '');
          }
        }
        // virtual-host：https://{bucket}.{endpoint-host}/{key}
        if (u.hostname === `${this.bucket}.${ep.hostname}`) {
          return u.pathname.replace(/^\//, '');
        }
      } catch {
        /* 解析失败按非本存储 URL 处理 */
      }
    }
    return null;
  }
}

/** 依据环境变量创建存储提供者（默认本地磁盘；s3 走对象存储） */
export function createUploadProvider(config: ConfigService): UploadProvider {
  const kind = config.get<string>('UPLOAD_PROVIDER', 'local').toLowerCase();
  switch (kind) {
    case 'local':
      return new LocalUploadProvider();
    case 's3':
      return new S3UploadProvider(config);
    default:
      throw new Error(`未知 UPLOAD_PROVIDER: ${kind}`);
  }
}
