import { MigrationInterface, QueryRunner } from 'typeorm';

/** 通知新增稳定分类与英文文案字段，客户端不再用中文关键词猜分类 */
export class AddNotificationLocalizationAndCategory1786349000000 implements MigrationInterface {
  name = 'AddNotificationLocalizationAndCategory1786349000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`notifications\`
       ADD COLUMN \`titleEn\` varchar(200) NULL AFTER \`content\`,
       ADD COLUMN \`contentEn\` text NULL AFTER \`titleEn\`,
       ADD COLUMN \`category\` varchar(20) NOT NULL DEFAULT 'system' AFTER \`contentEn\``,
    );

    // 兼容存量互动通知：按既有中文标题回填稳定分类
    await queryRunner.query(
      `UPDATE \`notifications\` SET \`category\` = 'like' WHERE \`title\` LIKE '%赞了你的作品%'`,
    );
    await queryRunner.query(
      `UPDATE \`notifications\` SET \`category\` = 'collect' WHERE \`title\` LIKE '%收藏了你的作品%'`,
    );
    await queryRunner.query(
      `UPDATE \`notifications\` SET \`category\` = 'comment' WHERE \`title\` LIKE '%评论了你%'`,
    );
    await queryRunner.query(
      `UPDATE \`notifications\` SET \`category\` = 'reply' WHERE \`title\` LIKE '%回复了你%'`,
    );
    await queryRunner.query(
      `UPDATE \`notifications\` SET \`category\` = 'follow' WHERE \`title\` LIKE '%关注了你%'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`notifications\`
       DROP COLUMN \`category\`,
       DROP COLUMN \`contentEn\`,
       DROP COLUMN \`titleEn\``,
    );
  }
}
