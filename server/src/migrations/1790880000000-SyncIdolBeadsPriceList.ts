import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 将线上 IDOL BEADS 门店与会员套餐同步为店内价目表的最新资费。
 * 这是存量数据修正；新库仍由 SeedIdolBeadsData 初始化。
 */
export class SyncIdolBeadsPriceList1790880000000
  implements MigrationInterface
{
  name = 'SyncIdolBeadsPriceList1790880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`stores\`
      SET \`address\` = '18A, SAGO STREET, SINGAPORE 059017',
          \`price\` = 9.9,
          \`memberPrice\` = 8,
          \`groupPrice\` = 9,
          \`allDayPrice\` = 49.9,
          \`allDayMemberPrice\` = 39.9,
          \`allDayGroupPrice\` = 45,
          \`weekendSurchargePercent\` = 10,
          \`businessHours\` = '10:00-21:00'
      WHERE \`name\` = 'IDOL BEADS'
    `);

    await queryRunner.query(`
      UPDATE \`store_packages\` p
      JOIN \`stores\` s ON s.\`id\` = p.\`storeId\`
      SET p.\`name\` = '6-Hour Fun Package',
          p.\`price\` = 39.9,
          p.\`memberPrice\` = 32,
          p.\`groupPrice\` = 36,
          p.\`enabled\` = 1
      WHERE s.\`name\` = 'IDOL BEADS' AND p.\`hours\` = 6
    `);

    await queryRunner.query(`
      UPDATE \`member_plans\`
      SET \`price\` = 19.9,
          \`originalPrice\` = 19.9,
          \`benefits\` = JSON_ARRAY('全场消费 8 折专属优惠'),
          \`badge\` = '',
          \`recommended\` = 0,
          \`enabled\` = 1
      WHERE \`name\` = '月卡'
    `);

    await queryRunner.query(`
      UPDATE \`member_plans\`
      SET \`price\` = 149,
          \`originalPrice\` = 149,
          \`benefits\` = JSON_ARRAY('全场消费 8 折专属优惠'),
          \`badge\` = '最划算',
          \`recommended\` = 1,
          \`enabled\` = 1
      WHERE \`name\` = '年卡'
    `);

    await queryRunner.query(
      `UPDATE \`member_plans\` SET \`enabled\` = 0, \`recommended\` = 0 WHERE \`name\` = '季卡'`,
    );
  }

  public async down(): Promise<void> {
    // 价目表是真实业务数据，不在回滚时恢复已过期价格。
  }
}
