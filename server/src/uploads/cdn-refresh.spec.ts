import { ConfigService } from '@nestjs/config';
import {
  aliyunSign,
  AliyunCdnRefresher,
  createCdnRefresher,
  NoopCdnRefresher,
} from './cdn-refresh';

describe('aliyunSign（阿里云 RPC 签名）', () => {
  it('与阿里云官方 KMS 文档示例一致（AccessKeySecret=testsecret）', () => {
    // 官方文档 https://help.aliyun.com/en/kms/key-management-service/request-signatures-3
    // StringToSign 完全一致，签名 41wk2SSX1GJh7fwnc5eqOfiJPFg= 与官方
    // "41wk2SSX1GJh7fwnc5eqOfiJPF****" 吻合（被遮住的末 4 位正是 g=）。
    const params = {
      Action: 'CreateKey',
      SignatureVersion: '1.0',
      Format: 'json',
      Version: '2016-01-20',
      AccessKeyId: 'testid',
      SignatureMethod: 'HMAC-SHA1',
      Timestamp: '2016-03-28T03:13:08Z',
    };
    expect(aliyunSign('testsecret', params)).toBe(
      '41wk2SSX1GJh7fwnc5eqOfiJPFg=',
    );
  });
});

describe('AliyunCdnRefresher', () => {
  const fetchSpy = jest.spyOn(global, 'fetch');

  beforeEach(() => {
    fetchSpy.mockReset();
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: jest.fn().mockResolvedValue({}),
    } as never);
  });

  afterAll(() => {
    fetchSpy.mockRestore();
  });

  it('缺少密钥时抛错', () => {
    expect(() => new AliyunCdnRefresher(new ConfigService({}))).toThrow(
      'ALIYUN_CDN_ACCESS_KEY_ID',
    );
  });

  it('刷新请求带 RPC 公共参数和签名，URL 用换行分隔', async () => {
    const refresher = new AliyunCdnRefresher(
      new ConfigService({
        ALIYUN_CDN_ACCESS_KEY_ID: 'testid',
        ALIYUN_CDN_ACCESS_KEY_SECRET: 'testsecret',
      }),
    );

    await refresher.refresh([
      'https://cdn.example.com/a.jpg',
      'https://cdn.example.com/b.jpg',
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = (fetchSpy.mock.calls[0][0] as string) ?? '';
    expect(url.startsWith('https://cdn.aliyuncs.com/?')).toBe(true);
    expect(url).toContain('Action=RefreshObjectCaches');
    expect(url).toContain('AccessKeyId=testid');
    expect(url).toContain('SignatureMethod=HMAC-SHA1');
    expect(url).toContain('ObjectType=File');
    expect(url).toContain('Signature=');
    expect(decodeURIComponent(url)).toContain(
      'ObjectPath=https://cdn.example.com/a.jpg\nhttps://cdn.example.com/b.jpg',
    );
  });

  it('超过 1000 个 URL 时按批拆分请求', async () => {
    const refresher = new AliyunCdnRefresher(
      new ConfigService({
        ALIYUN_CDN_ACCESS_KEY_ID: 'testid',
        ALIYUN_CDN_ACCESS_KEY_SECRET: 'testsecret',
      }),
    );
    const urls = Array.from(
      { length: 1001 },
      (_, i) => `https://cdn.example.com/${i}.jpg`,
    );

    await refresher.refresh(urls);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('只处理 http(s) URL，空列表不发请求', async () => {
    const refresher = new AliyunCdnRefresher(
      new ConfigService({
        ALIYUN_CDN_ACCESS_KEY_ID: 'testid',
        ALIYUN_CDN_ACCESS_KEY_SECRET: 'testsecret',
      }),
    );

    await refresher.refresh(['/uploads/local.jpg', 'ftp://x/y']);
    await refresher.refresh([]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('createCdnRefresher', () => {
  it('默认 none 返回空实现', () => {
    expect(createCdnRefresher(new ConfigService({}))).toBeInstanceOf(
      NoopCdnRefresher,
    );
  });

  it('aliyun 返回阿里云实现', () => {
    const refresher = createCdnRefresher(
      new ConfigService({
        CDN_PROVIDER: 'aliyun',
        ALIYUN_CDN_ACCESS_KEY_ID: 'id',
        ALIYUN_CDN_ACCESS_KEY_SECRET: 'secret',
      }),
    );
    expect(refresher).toBeInstanceOf(AliyunCdnRefresher);
  });

  it('未知服务商抛错', () => {
    expect(() =>
      createCdnRefresher(new ConfigService({ CDN_PROVIDER: 'tencent' })),
    ).toThrow('未知 CDN_PROVIDER');
  });
});
