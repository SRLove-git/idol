import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 管理端角色模型：
 * 1) users 增加 adminRole（super_admin / operator / moderator / auditor），
 *    仅 role=admin 的管理员账号有意义；
 * 2) 存量管理员默认升级为 super_admin（保持既有全部权限不缩水）。
 */
export class AddAdminRole1791000000000 implements MigrationInterface {
  name = 'AddAdminRole1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 开发环境 synchronize 可能已建列，判存在避免重复（幂等）
    const cols = (await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'adminRole'
       LIMIT 1`,
    )) as unknown as Array<Record<string, unknown>>;
    if (!cols.length) {
      await queryRunner.query(
        `ALTER TABLE \`users\`
         ADD COLUMN \`adminRole\` enum ('super_admin', 'operator', 'moderator', 'auditor') NULL
         AFTER \`role\``,
      );
    }
    await queryRunner.query(
      `UPDATE \`users\` SET \`adminRole\` = 'super_admin'
       WHERE \`role\` = 'admin' AND \`adminRole\` IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `users` DROP COLUMN `adminRole`');
  }
}
