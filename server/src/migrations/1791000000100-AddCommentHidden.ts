import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 评论内容审核：post_comments / video_comments 增加 isHidden，
 * 违规评论由管理端隐藏后对全体用户不可见（作者侧保留）。
 */
export class AddCommentHidden1791000000100 implements MigrationInterface {
  name = 'AddCommentHidden1791000000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureColumn(
      queryRunner,
      'post_comments',
      'ALTER TABLE `post_comments` ADD COLUMN `isHidden` tinyint NOT NULL DEFAULT 0',
    );
    await this.ensureColumn(
      queryRunner,
      'video_comments',
      'ALTER TABLE `video_comments` ADD COLUMN `isHidden` tinyint NOT NULL DEFAULT 0',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `post_comments` DROP COLUMN `isHidden`',
    );
    await queryRunner.query(
      'ALTER TABLE `video_comments` DROP COLUMN `isHidden`',
    );
  }

  private async ensureColumn(
    queryRunner: QueryRunner,
    table: string,
    ddl: string,
  ): Promise<void> {
    const cols = (await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = 'isHidden'
       LIMIT 1`,
      [table],
    )) as unknown as Array<Record<string, unknown>>;
    if (!cols.length) {
      await queryRunner.query(ddl);
    }
  }
}
