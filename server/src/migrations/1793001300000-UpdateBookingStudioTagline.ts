import { MigrationInterface, QueryRunner } from 'typeorm';

/** 将预约页品牌说明统一为官方标语。 */
export class UpdateBookingStudioTagline1793001300000
  implements MigrationInterface
{
  name = 'UpdateBookingStudioTagline1793001300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`stores\`
      SET \`siteContent\` = JSON_SET(
        \`siteContent\`,
        '$.translations.zh.studio_location',
        'IDOL BEADS，与快乐同行',
        '$.translations.en.studio_location',
        'IDOL BEADS, joy every step of the way'
      )
      WHERE \`name\` = 'IDOL BEADS'
        AND \`siteContent\` IS NOT NULL
    `);
  }

  public async down(): Promise<void> {
    // 品牌标语更新不回滚为旧门店介绍。
  }
}
