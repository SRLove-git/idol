import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CaptchaService } from './captcha.service';

/** 图形验证码：生成 SVG + 元信息，供登录/注册页展示 */
@Controller('captcha')
export class CaptchaController {
  constructor(private readonly captcha: CaptchaService) {}

  /** 返回 id + SVG data URI（客户端可直接渲染，无需跨域图片请求） */
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async create() {
    return this.captcha.createImageCaptcha();
  }
}
