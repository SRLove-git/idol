import { MigrationInterface, QueryRunner } from 'typeorm';

/** 自动下钟轮询索引：(status, date, endTime) */
export class AddAppointmentAutoClockoutIndex1786344100000 implements MigrationInterface {
  name = 'AddAppointmentAutoClockoutIndex1786344100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX \`IDX_appointment_status_date_end\` ON \`appointments\` (\`status\`, \`date\`, \`endTime\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_appointment_status_date_end\` ON \`appointments\``,
    );
  }
}
