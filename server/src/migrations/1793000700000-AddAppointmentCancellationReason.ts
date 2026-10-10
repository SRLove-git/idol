import { MigrationInterface, QueryRunner } from 'typeorm';

/** 记录管理员拒绝/取消预约时告知顾客的原因。 */
export class AddAppointmentCancellationReason1793000700000 implements MigrationInterface {
  name = 'AddAppointmentCancellationReason1793000700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `appointments` ADD `cancellationReason` varchar(200) NOT NULL DEFAULT '' AFTER `note`",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `appointments` DROP COLUMN `cancellationReason`',
    );
  }
}
