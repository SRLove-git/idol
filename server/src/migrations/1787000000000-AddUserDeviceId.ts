import { MigrationInterface, QueryRunner } from 'typeorm';

/** 用户表新增设备标识（MAC/安装ID）：同一设备最多注册 3 个账号（防恶意预约/刷号） */
export class AddUserDeviceId1787000000000 implements MigrationInterface {
  name = 'AddUserDeviceId1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`deviceId\` varchar(64) NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_users_device_id\` ON \`users\` (\`deviceId\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_users_device_id\` ON \`users\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`deviceId\``);
  }
}
