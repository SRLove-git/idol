import { MigrationInterface, QueryRunner } from 'typeorm';

/** 保存管理端营销邮件群发记录，支持幂等发送与结果追踪。 */
export class CreateMarketingEmailCampaigns1793001100000 implements MigrationInterface {
  name = 'CreateMarketingEmailCampaigns1793001100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE `marketing_email_campaigns` (`id` int NOT NULL AUTO_INCREMENT, `requestKey` varchar(36) NOT NULL, `subject` varchar(150) NOT NULL, `preheader` varchar(180) NOT NULL DEFAULT '', `heading` varchar(100) NOT NULL, `body` text NOT NULL, `ctaLabel` varchar(50) NOT NULL DEFAULT '', `ctaUrl` varchar(500) NOT NULL DEFAULT '', `status` enum ('sending','completed','partial','failed') NOT NULL DEFAULT 'sending', `recipientCount` int NOT NULL DEFAULT 0, `sentCount` int NOT NULL DEFAULT 0, `failedCount` int NOT NULL DEFAULT 0, `createdBy` int NOT NULL, `completedAt` datetime NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_marketing_email_campaign_request_key` (`requestKey`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `marketing_email_campaigns`');
  }
}
