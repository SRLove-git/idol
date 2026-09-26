import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * IDOL BEADS 门店真实资费导入（新加坡元 SGD，幂等）。
 *
 * - 1 小时：门市 9.9 / 会员 8 / 多人同行 9
 * - 6 小时套餐：门市 39.9 / 会员 32 / 多人同行 36
 * - 全天不限时：门市 49.9 / 会员 39.9 / 多人同行 45
 * - 周末/节假日所有档位加收 10%（当前按周六日判定）
 * - 会员：月卡 19.90 / 年卡 149，全场 8 折
 */
export class SeedIdolBeadsData1786346100000 implements MigrationInterface {
  name = 'SeedIdolBeadsData1786346100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 门店（不存在时插入）
    await queryRunner.query(`
      INSERT INTO \`stores\`
        (\`name\`, \`address\`, \`rating\`, \`price\`, \`memberPrice\`, \`groupPrice\`,
         \`allDayPrice\`, \`allDayMemberPrice\`, \`allDayGroupPrice\`,
         \`weekendSurchargePercent\`, \`businessHours\`, \`phone\`, \`enabled\`,
         \`createdAt\`, \`updatedAt\`)
      SELECT 'IDOL BEADS', '18A, SAGO STREET, SINGAPORE 059017', 5,
             9.9, 8, 9, 49.9, 39.9, 45, 10, '10:00-21:00', '', 1,
             NOW(6), NOW(6)
      WHERE NOT EXISTS (SELECT 1 FROM \`stores\` WHERE \`name\` = 'IDOL BEADS')
    `);

    // 默认桌位（4 桌 × 4 人，可在管理端调整）
    await queryRunner.query(`
      INSERT INTO \`store_tables\` (\`storeId\`, \`name\`, \`capacity\`, \`enabled\`, \`createdAt\`, \`updatedAt\`)
      SELECT s.\`id\`, t.\`name\`, t.\`capacity\`, 1, NOW(6), NOW(6)
      FROM \`stores\` s
      JOIN (
        SELECT 'A1' AS \`name\`, 4 AS \`capacity\`
        UNION ALL SELECT 'A2', 4
        UNION ALL SELECT 'B1', 4
        UNION ALL SELECT 'B2', 4
      ) t
      WHERE s.\`name\` = 'IDOL BEADS'
        AND NOT EXISTS (
          SELECT 1 FROM \`store_tables\` st
          WHERE st.\`storeId\` = s.\`id\` AND st.\`name\` = t.\`name\`
        )
    `);

    // 6 小时畅玩套餐（用户端按英语展示：6-Hour Fun Package）
    await queryRunner.query(`
      INSERT INTO \`store_packages\`
        (\`storeId\`, \`name\`, \`hours\`, \`price\`, \`memberPrice\`, \`groupPrice\`,
         \`enabled\`, \`sortOrder\`, \`createdAt\`, \`updatedAt\`)
      SELECT s.\`id\`, '6-Hour Fun Package', 6, 39.9, 32, 36, 1, 1, NOW(6), NOW(6)
      FROM \`stores\` s
      WHERE s.\`name\` = 'IDOL BEADS'
        AND NOT EXISTS (
          SELECT 1 FROM \`store_packages\` p
          JOIN \`stores\` s2 ON p.\`storeId\` = s2.\`id\`
          WHERE s2.\`name\` = 'IDOL BEADS' AND p.\`name\` = '6-Hour Fun Package'
        )
    `);

    // 会员计划：月卡 / 年卡（新库插入，旧库覆盖为真实资费）
    await queryRunner.query(`
      INSERT INTO \`member_plans\`
        (\`name\`, \`durationDays\`, \`price\`, \`originalPrice\`, \`benefits\`,
         \`badge\`, \`recommended\`, \`enabled\`, \`createdAt\`, \`updatedAt\`)
      SELECT '月卡', 30, '19.90', '19.90',
             JSON_ARRAY('全场消费8折专属优惠'), '', 0, 1, NOW(6), NOW(6)
      WHERE NOT EXISTS (SELECT 1 FROM \`member_plans\` WHERE \`name\` = '月卡')
    `);
    await queryRunner.query(`
      INSERT INTO \`member_plans\`
        (\`name\`, \`durationDays\`, \`price\`, \`originalPrice\`, \`benefits\`,
         \`badge\`, \`recommended\`, \`enabled\`, \`createdAt\`, \`updatedAt\`)
      SELECT '年卡', 365, '149.00', '149.00',
             JSON_ARRAY('全场消费8折专属优惠'), '最划算', 1, 1, NOW(6), NOW(6)
      WHERE NOT EXISTS (SELECT 1 FROM \`member_plans\` WHERE \`name\` = '年卡')
    `);
    await queryRunner.query(`
      UPDATE \`member_plans\`
      SET \`price\` = '19.90', \`originalPrice\` = '19.90',
          \`benefits\` = JSON_ARRAY('全场消费8折专属优惠'),
          \`enabled\` = 1, \`badge\` = ''
      WHERE \`name\` = '月卡'
    `);
    await queryRunner.query(`
      UPDATE \`member_plans\`
      SET \`price\` = '149.00', \`originalPrice\` = '149.00',
          \`benefits\` = JSON_ARRAY('全场消费8折专属优惠'),
          \`enabled\` = 1, \`badge\` = '最划算', \`recommended\` = 1
      WHERE \`name\` = '年卡'
    `);
    await queryRunner.query(`
      UPDATE \`member_plans\` SET \`enabled\` = 0 WHERE \`name\` = '季卡'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`store_packages\` WHERE \`name\` = '6-Hour Fun Package'`,
    );
    await queryRunner.query(
      `DELETE FROM \`store_tables\` WHERE \`storeId\` IN (SELECT \`id\` FROM \`stores\` WHERE \`name\` = 'IDOL BEADS')`,
    );
    await queryRunner.query(
      `DELETE FROM \`stores\` WHERE \`name\` = 'IDOL BEADS'`,
    );
  }
}
