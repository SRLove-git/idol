import { ConfigService } from '@nestjs/config';
import { SmtpEmailService } from './email.service';

const sendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail })),
}));

describe('SmtpEmailService', () => {
  const config = new ConfigService({
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: 465,
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM: 'DIY <no-reply@example.com>',
  });

  beforeEach(() => {
    sendMail.mockReset();
  });

  it('调用 transporter.sendMail 并带上发件人与收件人', async () => {
    sendMail.mockResolvedValue({ messageId: 'm1' });
    const svc = new SmtpEmailService(config);

    await svc.send('a@example.com', '主题', '正文');

    expect(sendMail).toHaveBeenCalledWith({
      from: 'DIY <no-reply@example.com>',
      to: 'a@example.com',
      subject: '主题',
      text: '正文',
    });
  });

  it('发送失败时抛出异常', async () => {
    sendMail.mockRejectedValue(new Error('connection refused'));
    const svc = new SmtpEmailService(config);

    await expect(svc.send('a@example.com', '主题', '正文')).rejects.toThrow(
      'connection refused',
    );
  });
});
