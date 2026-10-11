import { MigrationInterface, QueryRunner } from 'typeorm';

/** 将首页活动轮播更新为最新的工作室实景图。 */
export class UpdateHomepageBanner1793000800000 implements MigrationInterface {
  name = 'UpdateHomepageBanner1793000800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`stores\`
      SET \`siteContent\` = JSON_SET(
        \`siteContent\`,
        '$.media.banners',
        JSON_ARRAY(
          '/photos/banner-studio-room.jpg',
          '/photos/banner-studio-story.jpg'
        )
      )
      WHERE \`name\` = 'IDOL BEADS'
        AND \`siteContent\` IS NOT NULL
    `);
  }

  public async down(): Promise<void> {
    // 品牌素材更新不回滚为旧图片。
  }
}
