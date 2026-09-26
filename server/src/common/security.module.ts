import { Global, Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { CaptchaController } from './captcha.controller';
import { CaptchaService } from './captcha.service';

/** 全局安全服务：人机验证、爬虫 UA 识别（供 Auth/Uploads 等模块注入） */
@Global()
@Module({
  controllers: [CaptchaController],
  providers: [CaptchaService, BotService],
  exports: [CaptchaService, BotService],
})
export class SecurityModule {}
