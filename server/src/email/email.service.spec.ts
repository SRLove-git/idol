import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createTransport } from 'nodemailer';
import { DevEmailService, SmtpEmailService } from './email.service';

const sendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail })),
}));

jest.mock('node:fs/promises', () => ({ readFile: jest.fn() }));

describe('SmtpEmailService', () => {
  const config = new ConfigService({
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '465',
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM: 'DIY <no-reply@example.com>',
  });

  beforeEach(() => {
    sendMail.mockReset();
    jest.mocked(readFile).mockReset();
  });

  it('调用 transporter.sendMail 并带上发件人与收件人', async () => {
    sendMail.mockResolvedValue({ messageId: 'm1' });
    const svc = new SmtpEmailService(config);

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 465, secure: true }),
    );

    await svc.send('a@example.com', '主题', '正文');

    expect(sendMail).toHaveBeenCalledWith({
      from: 'DIY <no-reply@example.com>',
      to: 'a@example.com',
      subject: '主题',
      text: '正文',
      html: undefined,
    });
    expect(readFile).not.toHaveBeenCalled();
  });

  it('品牌邮件同时发送 HTML、纯文本备用内容与内嵌 Logo', async () => {
    const logo = Buffer.from('test-png-content');
    jest.mocked(readFile).mockResolvedValue(logo);
    sendMail.mockResolvedValue({ messageId: 'm2' });
    const svc = new SmtpEmailService(config);
    const content = {
      text: '验证码：123456',
      html: '<img src="cid:idol-beads-logo"><p>验证码：123456</p>',
    };

    await svc.send('a@example.com', 'IDOL BEADS 注册验证码', content);

    expect(readFile).toHaveBeenCalledWith(
      join(process.cwd(), 'assets/email/idol-logo.png'),
    );
    expect(sendMail).toHaveBeenCalledWith({
      from: 'DIY <no-reply@example.com>',
      to: 'a@example.com',
      subject: 'IDOL BEADS 注册验证码',
      ...content,
      attachments: [
        {
          filename: 'idol-beads-logo.png',
          content: logo,
          contentType: 'image/png',
          contentDisposition: 'inline',
          cid: 'idol-beads-logo',
        },
      ],
    });
  });

  it('未自定义 SMTP_FROM 时使用 IDOL BEADS 发件人', async () => {
    sendMail.mockResolvedValue({ messageId: 'm3' });
    const svc = new SmtpEmailService(new ConfigService());

    await svc.send('a@example.com', '主题', '正文');

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'IDOL BEADS <no-reply@mail.idol-sg.com>',
      }),
    );
  });

  it('可同时发送纯文本与 HTML 邮件内容', async () => {
    sendMail.mockResolvedValue({ messageId: 'm2' });
    const svc = new SmtpEmailService(config);

    await svc.send(
      'a@example.com',
      '主题',
      '纯文本',
      '<strong>品牌邮件</strong>',
    );

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: '纯文本',
        html: '<strong>品牌邮件</strong>',
      }),
    );
  });

  it('发送失败时抛出异常', async () => {
    sendMail.mockRejectedValue(new Error('connection refused'));
    const svc = new SmtpEmailService(config);

    await expect(svc.send('a@example.com', '主题', '正文')).rejects.toThrow(
      'connection refused',
    );
  });
});

describe('DevEmailService', () => {
  it('品牌邮件在开发日志中只输出可读纯文本', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    try {
      await new DevEmailService().send('a@example.com', '注册验证码', {
        text: '验证码：123456',
        html: '<p>验证码：123456</p>',
      });

      expect(log).toHaveBeenCalledWith(
        '[DevEmail] 发送至 a@example.com：注册验证码 / 验证码：123456',
      );
    } finally {
      log.mockRestore();
    }
  });
});
