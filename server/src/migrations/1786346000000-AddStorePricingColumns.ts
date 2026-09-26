import { MigrationInterface, QueryRunner } from 'typeorm';

/** 门店/套餐新增计价字段：多人同行价、全天会员价/多人价、周末加价 */
export class AddStorePricingColumns1786346000000 implements MigrationInterface {
  name = 'AddStorePricingColumns1786346000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`stores\`
       ADD COLUMN \`groupPrice\` decimal(10,2) NULL AFTER \`memberPrice\`,
       ADD COLUMN \`allDayMemberPrice\` decimal(10,2) NULL AFTER \`allDayPrice\`,
       ADD COLUMN \`allDayGroupPrice\` decimal(10,2) NULL AFTER \`allDayMemberPrice\`,
       ADD COLUMN \`weekendSurchargePercent\` int NOT NULL DEFAULT 0 AFTER \`allDayGroupPrice\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`store_packages\`
       ADD COLUMN \`memberPrice\` decimal(10,2) NULL AFTER \`price\`,
       ADD COLUMN \`groupPrice\` decimal(10,2) NULL AFTER \`memberPrice\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`store_packages\` DROP COLUMN \`groupPrice\`, DROP COLUMN \`memberPrice\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`stores\`
       DROP COLUMN \`weekendSurchargePercent\`,
       DROP COLUMN \`allDayGroupPrice\`,
       DROP COLUMN \`allDayMemberPrice\`,
       DROP COLUMN \`groupPrice\``,
    );
  }
}
