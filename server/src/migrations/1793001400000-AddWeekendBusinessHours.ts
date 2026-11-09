import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddWeekendBusinessHours1793001400000
  implements MigrationInterface
{
  name = 'AddWeekendBusinessHours1793001400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('stores', 'weekendBusinessHours'))) {
      await queryRunner.addColumn(
        'stores',
        new TableColumn({
          name: 'weekendBusinessHours',
          type: 'varchar',
          length: '50',
          default: "'10:00-21:00'",
          isNullable: false,
        }),
      );
    }

    await queryRunner.query(`
      UPDATE \`stores\`
      SET \`businessHours\` = '10:00-20:00',
          \`weekendBusinessHours\` = '10:00-21:00'
      WHERE \`name\` = 'IDOL BEADS'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('stores', 'weekendBusinessHours')) {
      await queryRunner.dropColumn('stores', 'weekendBusinessHours');
    }
  }
}
