import { MigrationInterface, QueryRunner } from 'typeorm';

/** 将官网首屏与轮播更新为统一的手绘拼贴风格。 */
export class RefreshHomepageArtwork1793000600000
  implements MigrationInterface
{
  name = 'RefreshHomepageArtwork1793000600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`stores\`
      SET \`siteContent\` = JSON_SET(
        \`siteContent\`,
        '$.media.heroBackground',
        '/photos/hero-collage.jpg',
        '$.media.banners',
        JSON_ARRAY(
          '/photos/banner-collage-1.jpg',
          '/photos/banner-collage-2.jpg'
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
