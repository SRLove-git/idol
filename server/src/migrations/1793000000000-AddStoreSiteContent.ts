import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStoreSiteContent1793000000000 implements MigrationInterface {
  name = 'AddStoreSiteContent1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `stores` ADD `siteContent` json NULL AFTER `images`',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `stores` DROP COLUMN `siteContent`');
  }
}
