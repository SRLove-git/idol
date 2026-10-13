import { MigrationInterface, QueryRunner } from 'typeorm';

/** 将首页轮播更新为带 IDOL BEADS 品牌插画的工作室实景图。 */
export class UpdateHomepageBrandBanners1793001000000
  implements MigrationInterface
{
  name = 'UpdateHomepageBrandBanners1793001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`stores\`
      SET \`siteContent\` = JSON_SET(
        \`siteContent\`,
        '$.media.banners',
        JSON_ARRAY(
          '/photos/banner-studio-brand-1.jpg',
          '/photos/banner-studio-brand-2.jpg'
        )
      )
      WHERE \`name\` = 'IDOL BEADS'
        AND \`siteContent\` IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
}
