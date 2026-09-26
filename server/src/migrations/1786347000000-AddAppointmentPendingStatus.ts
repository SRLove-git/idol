import { MigrationInterface, QueryRunner } from 'typeorm';

/** 预约状态机新增「待确认」：手机下单 → pending → 管理端确认 → booked */
export class AddAppointmentPendingStatus1786347000000 implements MigrationInterface {
  name = 'AddAppointmentPendingStatus1786347000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`appointments\` MODIFY \`status\` enum ('pending', 'booked', 'checked_in', 'in_service', 'completed', 'cancelled') NOT NULL DEFAULT 'booked'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`appointments\` MODIFY \`status\` enum ('booked', 'checked_in', 'in_service', 'completed', 'cancelled') NOT NULL DEFAULT 'booked'`,
    );
  }
}
