/**
 * 管理端角色与权限矩阵
 *
 * 角色：
 * - super_admin 超级管理员：全部权限
 * - operator    运营：门店 / 预约 / 会员 / 活动 / 用户 / 通知
 * - moderator   审核员：内容审核（社区 / 短视频 / 曲库 / 评论 / 聊天 / 敏感词）
 * - auditor     审计员：数据看板 + 审计日志（只读）
 */
export const ADMIN_ROLES = [
  'super_admin',
  'operator',
  'moderator',
  'auditor',
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** 管理端权限点（与前端菜单一一对应） */
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  STORES_MANAGE: 'stores.manage',
  ORDERS_MANAGE: 'orders.manage',
  ACTIVITIES_MANAGE: 'activities.manage',
  USERS_MANAGE: 'users.manage',
  MEMBERS_MANAGE: 'members.manage',
  NOTIFICATIONS_MANAGE: 'notifications.manage',
  CONTENT_MODERATION: 'content.moderation',
  AUDIT_VIEW: 'audit.view',
  ADMIN_MANAGE: 'admin.manage',
} as const;

const ALL = '*';

export const ROLE_PERMISSIONS: Record<AdminRole, readonly string[]> = {
  super_admin: [ALL],
  operator: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.STORES_MANAGE,
    PERMISSIONS.ORDERS_MANAGE,
    PERMISSIONS.ACTIVITIES_MANAGE,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.MEMBERS_MANAGE,
    PERMISSIONS.NOTIFICATIONS_MANAGE,
  ],
  moderator: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.CONTENT_MODERATION],
  auditor: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.AUDIT_VIEW],
};

/** 角色是否拥有指定权限（super_admin 通配所有） */
export function hasAdminPermission(
  role: AdminRole | null | undefined,
  permission: string,
): boolean {
  if (!role) return false;
  const granted = ROLE_PERMISSIONS[role];
  if (!granted) return false;
  return granted.includes(ALL) || granted.includes(permission);
}
