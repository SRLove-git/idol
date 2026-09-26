import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // CORS 白名单：与 bootstrap 保持一致，测试安全头与跨域行为
    process.env.CORS_ORIGINS =
      'http://localhost:5173,https://admin.example.com';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  it('helmet 安全响应头已启用', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect('x-content-type-options', 'nosniff')
      .expect('x-frame-options', 'SAMEORIGIN');
  });

  it('CORS 白名单内的来源被放行', () => {
    return request(app.getHttpServer())
      .get('/api')
      .set('Origin', 'http://localhost:5173')
      .expect('access-control-allow-origin', 'http://localhost:5173');
  });

  it('CORS 白名单外的来源不带跨域头', () => {
    return request(app.getHttpServer())
      .get('/api')
      .set('Origin', 'https://evil.example.com')
      .then((res) => {
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
      });
  });
});
