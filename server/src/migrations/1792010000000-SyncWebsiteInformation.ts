import { MigrationInterface, QueryRunner } from 'typeorm';

/** 同步客户提供的网站资料：4 小时套餐与最新会员权益。 */
export class SyncWebsiteInformation1792010000000
  implements MigrationInterface
{
  name = 'SyncWebsiteInformation1792010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`store_packages\` p
      JOIN \`stores\` s ON s.\`id\` = p.\`storeId\`
      SET p.\`name\` = '4-Hour Fun Package',
          p.\`hours\` = 4,
          p.\`price\` = 39.9,
          p.\`memberPrice\` = 32,
          p.\`groupPrice\` = 36,
          p.\`enabled\` = 1
      WHERE s.\`name\` = 'IDOL BEADS' AND p.\`hours\` = 6
    `);

    await queryRunner.query(`
      UPDATE \`member_plans\`
      SET \`benefits\` = JSON_ARRAY(
        '每件作品赠送 1 份 DIY 饰品，不限作品数量',
        '每日到店可免费领取饮品 1 杯'
      )
      WHERE \`name\` IN ('月卡', '年卡')
    `);
  }

  public async down(): Promise<void> {
    // 客户提供的最新业务资料不在回滚时恢复为旧信息。
  }
}
