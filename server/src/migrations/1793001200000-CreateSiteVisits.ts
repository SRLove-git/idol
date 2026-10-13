import { MigrationInterface, QueryRunner } from 'typeorm';

/** 新增官网匿名日访客记录，支持后台累计与近 7 天访问统计。 */
export class CreateSiteVisits1793001200000 implements MigrationInterface {
  name = 'CreateSiteVisits1793001200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE `site_visits` (`id` int NOT NULL AUTO_INCREMENT, `visitorHash` varchar(64) NOT NULL, `visitDate` date NOT NULL, `entryPath` varchar(120) NOT NULL DEFAULT '/', `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_site_visits_visitor_hash` (`visitorHash`), UNIQUE INDEX `IDX_site_visits_date_visitor` (`visitDate`, `visitorHash`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `site_visits`');
  }
}
