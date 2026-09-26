import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 桌位命名规则落地：字母 = 人数（A=1人桌 / B=2人桌 / C=4人桌），数字 = 同类型序号，
 * 座位号为「桌名-座位序号」（如 B1-2 = 第一个二人桌的 2 号座位）。
 *
 * IDOL BEADS 默认桌位由 4 桌 × 4 人改为混编：
 * A1、A2（1人桌）、B1、B2（2人桌）、C1、C2（4人桌）。
 * 原 4 张桌就地改容量（保留 id，历史预约的 JSON 快照不受影响），再补插 C1/C2。
 */
export class StoreTableCapacityNaming1786499866000 implements MigrationInterface {
  name = 'StoreTableCapacityNaming1786499866000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 现有 A1/A2 → 1人桌，B1/B2 → 2人桌（仅调整容量为 4 的默认桌，幂等）
    await queryRunner.query(`
      UPDATE \`store_tables\` st
      JOIN \`stores\` s ON st.\`storeId\` = s.\`id\`
      SET st.\`capacity\` = CASE st.\`name\`
        WHEN 'A1' THEN 1
        WHEN 'A2' THEN 1
        WHEN 'B1' THEN 2
        WHEN 'B2' THEN 2
        ELSE st.\`capacity\` END
      WHERE s.\`name\` = 'IDOL BEADS'
        AND st.\`name\` IN ('A1', 'A2', 'B1', 'B2')
        AND st.\`capacity\` = 4
    `);
    // 补插 4 人桌 C1 / C2（幂等）
    await queryRunner.query(`
      INSERT INTO \`store_tables\` (\`storeId\`, \`name\`, \`capacity\`, \`enabled\`, \`createdAt\`, \`updatedAt\`)
      SELECT s.\`id\`, t.\`name\`, 4, 1, NOW(6), NOW(6)
      FROM \`stores\` s
      JOIN (SELECT 'C1' AS \`name\` UNION ALL SELECT 'C2') t
      WHERE s.\`name\` = 'IDOL BEADS'
        AND NOT EXISTS (
          SELECT 1 FROM \`store_tables\` st
          WHERE st.\`storeId\` = s.\`id\` AND st.\`name\` = t.\`name\`
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 还原：4 桌 × 4 人（A1/A2/B1/B2），移除 C1/C2
    await queryRunner.query(`
      UPDATE \`store_tables\` st
      JOIN \`stores\` s ON st.\`storeId\` = s.\`id\`
      SET st.\`capacity\` = 4
      WHERE s.\`name\` = 'IDOL BEADS' AND st.\`name\` IN ('A1', 'A2', 'B1', 'B2')
    `);
    await queryRunner.query(`
      DELETE st FROM \`store_tables\` st
      JOIN \`stores\` s ON st.\`storeId\` = s.\`id\`
      WHERE s.\`name\` = 'IDOL BEADS' AND st.\`name\` IN ('C1', 'C2')
    `);
  }
}
