import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION = 'audit:action';
export const AUDIT_TARGET_TYPE = 'audit:targetType';

/**
 * 标记管理端敏感操作：Audit('user.ban', 'user')。
 * 配合全局 AuditInterceptor 在操作成功后写入审计日志。
 */
export function Audit(action: string, targetType?: string): MethodDecorator {
  return (target, key, descriptor) => {
    SetMetadata(AUDIT_ACTION, action)(target, key, descriptor);
    if (targetType) {
      SetMetadata(AUDIT_TARGET_TYPE, targetType)(target, key, descriptor);
    }
  };
}
