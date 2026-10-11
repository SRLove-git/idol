import { MigrationInterface, QueryRunner } from 'typeorm';

/** 保存预约获客渠道，并为营销邮件订阅建立可审计的用户与预约记录。 */
export class AddBookingAcquisitionAndMarketingConsent1793000900000 implements MigrationInterface {
  name = 'AddBookingAcquisitionAndMarketingConsent1793000900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `appointments` ADD `acquisitionSource` varchar(30) NOT NULL DEFAULT '' AFTER `note`, ADD `marketingEmailConsent` tinyint NOT NULL DEFAULT 0 AFTER `acquisitionSource`, ADD `marketingEmailConsentAt` datetime NULL AFTER `marketingEmailConsent`",
    );
    await queryRunner.query(
      "ALTER TABLE `users` ADD `marketingEmailConsent` tinyint NOT NULL DEFAULT 0 AFTER `location`, ADD `marketingEmailConsentAt` datetime NULL AFTER `marketingEmailConsent`, ADD `marketingEmailConsentSource` varchar(30) NOT NULL DEFAULT '' AFTER `marketingEmailConsentAt`",
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_users_marketing_email_consent` ON `users` (`marketingEmailConsent`, `marketingEmailConsentAt`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_users_marketing_email_consent` ON `users`',
    );
    await queryRunner.query(
      'ALTER TABLE `users` DROP COLUMN `marketingEmailConsentSource`, DROP COLUMN `marketingEmailConsentAt`, DROP COLUMN `marketingEmailConsent`',
    );
    await queryRunner.query(
      'ALTER TABLE `appointments` DROP COLUMN `marketingEmailConsentAt`, DROP COLUMN `marketingEmailConsent`, DROP COLUMN `acquisitionSource`',
    );
  }
}
