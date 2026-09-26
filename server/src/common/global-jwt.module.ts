import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

/** 全局 JwtModule：JwtAuthGuard 在任意模块使用均可用 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  exports: [JwtModule],
})
export class GlobalJwtModule {}
