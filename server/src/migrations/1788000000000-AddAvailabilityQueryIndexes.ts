import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * availability 桌位查询索引：
 * 1) appointments (storeId, date, status)：按门店+日期收窄「有效预约」扫描范围，
 *    配合 status IN (...) 走索引范围扫描（NOT IN 无法高效利用索引）。
 * 2) store_tables (storeId, enabled)：桌位列表按门店+启用过滤，避免全表扫描。
 *
 * 索引名与实体 @Index() 保持一致，避免后续 migration:generate 误报差异；
 * 创建前按 information_schema 判存在，重复执行安全。
 */
export class AddAvailabilityQueryIndexes1788000000000 implements MigrationInterface {
  name = 'AddAvailabilityQueryIndexes1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureIndex(
      queryRunner,
      'appointments',
      'IDX_appointment_store_date_status',
      'CREATE INDEX `IDX_appointment_store_date_status` ON `appointments` (`storeId`, `date`, `status`)',
    );
    await this.ensureIndex(
      queryRunner,
      'store_tables',
      'IDX_store_tables_store_enabled',
      'CREATE INDEX `IDX_store_tables_store_enabled` ON `store_tables` (`storeId`, `enabled`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_appointment_store_date_status` ON `appointments`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_store_tables_store_enabled` ON `store_tables`',
    );
  }

  /** 索引不存在时才创建（information_schema 判存在，重复执行安全） */
  private async ensureIndex(
    queryRunner: QueryRunner,
    table: string,
    indexName: string,
    createSql: string,
  ): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?
       LIMIT 1`,
      [table, indexName],
    )) as Array<unknown>;
    if (!rows.length) {
      try {
        await queryRunner.query(createSql);
      } catch (e) {
        // 多副本首次启动时可能并发执行同一迁移：索引已被另一副本创建，
        // MySQL 重复创建（ER_DUP_KEYNAME）视为成功，避免启动失败
        const msg = String((e as { message?: string })?.message ?? e);
        if (!msg.includes('Duplicate key name')) throw e;
      }
    }
  }
}
