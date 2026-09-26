import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DevEmailService,
  EmailService,
  SmtpEmailService,
} from './email.service';

@Module({
  providers: [
    {
      provide: EmailService,
      useFactory: (config: ConfigService) =>
        config.get<string>('SMTP_HOST')
          ? new SmtpEmailService(config)
          : new DevEmailService(),
      inject: [ConfigService],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
