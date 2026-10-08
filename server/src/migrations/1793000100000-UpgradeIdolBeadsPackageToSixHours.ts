import { MigrationInterface, QueryRunner } from 'typeorm';

/** 将 IDOL BEADS 的 4 小时套餐升级为 6 小时，价格保持不变。 */
export class UpgradeIdolBeadsPackageToSixHours1793000100000
  implements MigrationInterface
{
  name = 'UpgradeIdolBeadsPackageToSixHours1793000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`store_packages\` p
      JOIN \`stores\` s ON s.\`id\` = p.\`storeId\`
      SET p.\`name\` = '6-Hour Fun Package',
          p.\`hours\` = 6,
          p.\`price\` = 39.9,
          p.\`memberPrice\` = 32,
          p.\`groupPrice\` = 36,
          p.\`enabled\` = 1
      WHERE s.\`name\` = 'IDOL BEADS'
        AND (p.\`hours\` IN (4, 6) OR p.\`name\` IN ('4-Hour Fun Package', '6-Hour Fun Package'))
    `);
  }

  public async down(): Promise<void> {
    // 套餐时长属于业务资料更新，回滚时不恢复旧时长。
  }
}
