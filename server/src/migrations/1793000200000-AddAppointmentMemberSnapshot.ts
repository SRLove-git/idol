import { MigrationInterface, QueryRunner } from 'typeorm';

/** 在预约单上固化下单时的会员身份，供门店后台和历史订单展示。 */
export class AddAppointmentMemberSnapshot1793000200000
  implements MigrationInterface
{
  name = 'AddAppointmentMemberSnapshot1793000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`appointments\` ADD \`isMember\` tinyint NOT NULL DEFAULT 0`,
    );
    // 尽可能回填历史会员预约：会员记录创建后、有效期内产生的预约。
    await queryRunner.query(
      `UPDATE \`appointments\` a
       INNER JOIN \`memberships\` m ON m.\`userId\` = a.\`userId\`
       SET a.\`isMember\` = 1
       WHERE m.\`createdAt\` <= a.\`createdAt\` AND m.\`expireAt\` >= a.\`createdAt\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`appointments\` DROP COLUMN \`isMember\``,
    );
  }
}
