import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogs1790000000000 implements MigrationInterface {
  name = 'AddAuditLogs1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`audit_logs\` (\`id\` int NOT NULL AUTO_INCREMENT, \`actorId\` int NULL, \`action\` varchar(50) NOT NULL, \`targetType\` varchar(50) NULL, \`targetId\` varchar(64) NULL, \`detail\` json NULL, \`ip\` varchar(64) NULL, \`userAgent\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_audit_actor\` (\`actorId\`), INDEX \`IDX_audit_action\` (\`action\`), INDEX \`IDX_audit_target\` (\`targetType\`, \`targetId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`audit_logs\``);
  }
}
