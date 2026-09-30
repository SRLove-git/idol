import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { S3UploadProvider } from './uploads.provider';

const send: jest.Mock = jest.fn();
const done: jest.Mock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send })),
  DeleteObjectCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
}));

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest
    .fn()
    .mockImplementation((opts: { params: { Body: NodeJS.ReadableStream } }) => {
      // 模拟 SDK 消费上传流；即使临时文件提前被清理，也不要产生未处理 error 事件
      opts.params.Body.on('error', () => {});
      opts.params.Body.resume();
      return { done };
    }),
}));

describe('S3UploadProvider', () => {
  let dir: string;

  beforeEach(() => {
    send.mockReset();
    done.mockReset();
    (Upload as unknown as jest.Mock).mockClear();
    (DeleteObjectCommand as unknown as jest.Mock).mockClear();
    dir = mkdtempSync(join(tmpdir(), 'diy-upload-test-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('缺少 S3_BUCKET 时抛错', () => {
    const config = new ConfigService({ UPLOAD_PROVIDER: 's3' });
    expect(() => new S3UploadProvider(config)).toThrow('S3_BUCKET');
  });

  it('流式上传到 bucket 并返回 publicBase 下的 URL，临时文件被清理', async () => {
    done.mockResolvedValue({});
    const config = new ConfigService({
      S3_BUCKET: 'diy-media',
      S3_REGION: 'ap-shanghai',
      S3_PUBLIC_URL_BASE: 'https://cdn.example.com',
      S3_ACCESS_KEY: 'ak',
      S3_SECRET_KEY: 'sk',
    });
    const provider = new S3UploadProvider(config);
    const filePath = join(dir, 'abc.jpg');
    writeFileSync(filePath, Buffer.from([0xff, 0xd8]));

    const result = await provider.save(
      {
        path: filePath,
        filename: 'abc.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File,
      'post/2026/08',
    );

    expect(Upload).toHaveBeenCalledWith(
      expect.objectContaining({
        client: expect.any(Object) as object,
        params: {
          Bucket: 'diy-media',
          Key: 'post/2026/08/abc.jpg',
          Body: expect.any(Readable) as Readable,
          ContentType: 'image/jpeg',
        },
        queueSize: 4,
        partSize: 8 * 1024 * 1024,
      }),
    );
    expect(done).toHaveBeenCalledTimes(1);
    expect(result.url).toBe('https://cdn.example.com/post/2026/08/abc.jpg');
    // 临时文件已清理
    expect(existsSync(filePath)).toBe(false);
  });

  it('未配置 publicBase 时回退到 bucket 默认域名', async () => {
    done.mockResolvedValue({});
    const config = new ConfigService({
      S3_BUCKET: 'diy-media',
      S3_REGION: 'ap-shanghai',
    });
    const provider = new S3UploadProvider(config);
    const filePath = join(dir, 'a.png');
    writeFileSync(filePath, 'x');

    const result = await provider.save(
      {
        path: filePath,
        filename: 'a.png',
        mimetype: 'image/png',
      } as Express.Multer.File,
      'avatar/2026/08',
    );

    expect(result.url).toBe(
      'https://diy-media.s3.ap-shanghai.amazonaws.com/avatar/2026/08/a.png',
    );
  });

  it('按 publicBase 还原 key 并调用 DeleteObjectCommand', async () => {
    const config = new ConfigService({
      S3_BUCKET: 'diy-media',
      S3_REGION: 'ap-shanghai',
      S3_PUBLIC_URL_BASE: 'https://cdn.example.com',
    });
    const provider = new S3UploadProvider(config);

    await provider.delete('https://cdn.example.com/post/2026/08/abc.jpg');

    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: 'diy-media',
      Key: 'post/2026/08/abc.jpg',
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('按 bucket 默认域名还原 key', async () => {
    const config = new ConfigService({
      S3_BUCKET: 'diy-media',
      S3_REGION: 'ap-shanghai',
    });
    const provider = new S3UploadProvider(config);

    await provider.delete(
      'https://diy-media.s3.ap-shanghai.amazonaws.com/avatar/x.png',
    );

    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: 'diy-media',
      Key: 'avatar/x.png',
    });
  });

  it('endpoint path-style（MinIO/OSS 直连）：save 返回 endpoint/bucket/key，delete 还原 key', async () => {
    const config = new ConfigService({
      S3_BUCKET: 'diy-media',
      S3_REGION: 'us-east-1',
      S3_ENDPOINT: 'https://minio.example.com',
      S3_FORCE_PATH_STYLE: 'true',
    });
    const provider = new S3UploadProvider(config);
    done.mockResolvedValue({});
    const filePath = join(dir, 'a.png');
    writeFileSync(filePath, 'x');

    const result = await provider.save(
      {
        path: filePath,
        filename: 'a.png',
        mimetype: 'image/png',
      } as Express.Multer.File,
      'avatar/2026/08',
    );
    expect(result.url).toBe(
      'https://minio.example.com/diy-media/avatar/2026/08/a.png',
    );

    await provider.delete('https://minio.example.com/diy-media/a/b.jpg');

    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: 'diy-media',
      Key: 'a/b.jpg',
    });
  });

  it('endpoint virtual-host（阿里云 OSS 直连）还原 key', async () => {
    const config = new ConfigService({
      S3_BUCKET: 'diy-media',
      S3_REGION: 'cn-shanghai',
      S3_ENDPOINT: 'https://oss-cn-shanghai.aliyuncs.com',
    });
    const provider = new S3UploadProvider(config);
    done.mockResolvedValue({});
    const filePath = join(dir, 'b.jpg');
    writeFileSync(filePath, 'x');

    const result = await provider.save(
      {
        path: filePath,
        filename: 'b.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File,
      'post/2026/08',
    );
    expect(result.url).toBe(
      'https://diy-media.oss-cn-shanghai.aliyuncs.com/post/2026/08/b.jpg',
    );

    await provider.delete(
      'https://diy-media.oss-cn-shanghai.aliyuncs.com/post/2026/08/b.jpg',
    );

    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: 'diy-media',
      Key: 'post/2026/08/b.jpg',
    });
  });

  it('非本存储或非 http URL 静默跳过，不调用删除', async () => {
    const config = new ConfigService({
      S3_BUCKET: 'diy-media',
      S3_REGION: 'ap-shanghai',
      S3_PUBLIC_URL_BASE: 'https://cdn.example.com',
    });
    const provider = new S3UploadProvider(config);

    await provider.delete('https://other.com/x.jpg');
    await provider.delete('/uploads/local.jpg');

    expect(send).not.toHaveBeenCalled();
  });
});
