import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

/** 邮件发送抽象：生产接入 SMTP 邮件服务，开发用 DevEmailService 打印日志 */
export abstract class EmailService {
  abstract send(to: string, subject: string, content: string): Promise<void>;
}

@Injectable()
export class DevEmailService extends EmailService {
  private readonly logger = new Logger(DevEmailService.name);

  send(to: string, subject: string, content: string): Promise<void> {
    // 开发环境验证码直接打印到服务端日志，便于本地联调
    this.logger.log(`[DevEmail] 发送至 ${to}：${subject} / ${content}`);
    return Promise.resolve();
  }
}

/**
 * SMTP 邮件服务（生产）。
 *
 * 读取 SMTP_HOST/PORT/USER/PASS/FROM 环境变量创建 nodemailer transporter；
 * 未配置 SMTP_HOST 时由 EmailModule 选择 DevEmailService，不会走到这里。
 */
@Injectable()
export class SmtpEmailService extends EmailService {
  private readonly logger = new Logger(SmtpEmailService.name);
  private readonly transporter: Transporter<SMTPTransport.SentMessageInfo>;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    super();
    const host = config.get<string>('SMTP_HOST', '');
    const port = config.get<number>('SMTP_PORT', 465);
    const user = config.get<string>('SMTP_USER', '');
    const pass = config.get<string>('SMTP_PASS', '');
    this.from = config.get<string>(
      'SMTP_FROM',
      'DIY手作工坊 <no-reply@example.com>',
    );
    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
  }

  async send(to: string, subject: string, content: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text: content,
      });
      this.logger.log(`[SMTP] 已发送至 ${to}：${subject}`);
    } catch (e) {
      this.logger.error(
        `[SMTP] 发送失败（${to} / ${subject}）：${(e as Error).message}`,
      );
      throw e;
    }
  }
}
