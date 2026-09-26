import { MigrationInterface, QueryRunner } from 'typeorm';

/** 会员开通申请单：线上下单、到店支付，管理端确认后开通会员 */
export class CreateMemberOrders1786348000000 implements MigrationInterface {
  name = 'CreateMemberOrders1786348000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`member_orders\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`planId\` int NOT NULL, \`planName\` varchar(60) NOT NULL, \`durationDays\` int NOT NULL, \`amount\` decimal(10,2) NOT NULL DEFAULT '0.00', \`status\` enum ('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending', \`confirmedAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_member_orders_user\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`member_orders\``);
  }
}
