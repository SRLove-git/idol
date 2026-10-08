import { MigrationInterface, QueryRunner } from 'typeorm';

/** 将已保存的官网首屏背景更新为最新门店照片。 */
export class UpdateHeroBackground1793000400000 implements MigrationInterface {
  name = 'UpdateHeroBackground1793000400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`stores\`
      SET \`siteContent\` = JSON_SET(
        \`siteContent\`,
        '$.media.heroBackground',
        '/photos/hero-studio.jpg'
      )
      WHERE \`siteContent\` IS NOT NULL
        AND JSON_UNQUOTE(
          JSON_EXTRACT(\`siteContent\`, '$.media.heroBackground')
        ) = '/photos/indoor_1.webp'
    `);
  }

  public async down(): Promise<void> {
    // 品牌素材更新不回滚为旧背景。
  }
}
