import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 一次性完成关联表改造（未正式部署、无旧数据，根上不需要 JSON 列）：
 * 1) 建 appointment_tables（一单多桌关系，替代 appointments.tables JSON 列）；
 * 2) 建索引与外键；
 * 3) 删列兜底：若某环境曾用旧 InitialSchema 建过 tables 列（如压测库），
 *    这里判存在后删除；全新库从未建过该列，此步直接跳过。
 */
export class AddAppointmentTablesAndDropJson1789000000000 implements MigrationInterface {
  name = 'AddAppointmentTablesAndDropJson1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`appointment_tables\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`appointmentId\` int NOT NULL,
        \`tableId\` int NOT NULL,
        \`storeId\` int NOT NULL,
        \`date\` varchar(10) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await this.ensureIndex(
      queryRunner,
      'IDX_appointment_tables_appointment_table',
      'CREATE UNIQUE INDEX `IDX_appointment_tables_appointment_table` ON `appointment_tables` (`appointmentId`, `tableId`)',
    );
    await this.ensureIndex(
      queryRunner,
      'IDX_appointment_tables_store_date_table',
      'CREATE INDEX `IDX_appointment_tables_store_date_table` ON `appointment_tables` (`storeId`, `date`, `tableId`)',
    );
    await this.ensureForeignKey(
      queryRunner,
      'FK_appointment_tables_appointment',
      'ALTER TABLE `appointment_tables` ADD CONSTRAINT `FK_appointment_tables_appointment` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE CASCADE',
    );

    // 最后删旧 JSON 列（判存在，幂等）
    const cols = (await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'appointments' AND column_name = 'tables'
       LIMIT 1`,
    )) as unknown as Array<Record<string, unknown>>;
    if (cols.length) {
      await queryRunner.query(
        'ALTER TABLE `appointments` DROP COLUMN `tables`',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 先恢复 JSON 列并从关联表聚合回填（仅 id，保底可恢复）
    await queryRunner.query(
      'ALTER TABLE `appointments` ADD COLUMN `tables` json NULL',
    );
    await queryRunner.query(`
      UPDATE \`appointments\` a
      LEFT JOIN (
        SELECT appointmentId, JSON_ARRAYAGG(JSON_OBJECT('id', tableId)) AS j
        FROM appointment_tables
        GROUP BY appointmentId
      ) x ON x.appointmentId = a.id
      SET a.tables = x.j
    `);
    await queryRunner
      .query(
        'ALTER TABLE `appointment_tables` DROP FOREIGN KEY `FK_appointment_tables_appointment`',
      )
      .catch(() => undefined);
    await queryRunner.query('DROP TABLE IF EXISTS `appointment_tables`');
  }

  /** 索引不存在时才创建（information_schema 判存在，重复执行安全） */
  private async ensureIndex(
    queryRunner: QueryRunner,
    indexName: string,
    createSql: string,
  ): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = 'appointment_tables' AND index_name = ?
       LIMIT 1`,
      [indexName],
    )) as unknown as Array<Record<string, unknown>>;
    if (!rows.length) {
      try {
        await queryRunner.query(createSql);
      } catch (e) {
        // 多副本首次启动可能并发执行同一迁移：索引已被另一副本创建
        const msg = String((e as { message?: string })?.message ?? e);
        if (!msg.includes('Duplicate key name')) throw e;
      }
    }
  }

  /** 外键不存在时才创建，多副本并发重复创建（ER_DUP_KEYNAME）视为成功 */
  private async ensureForeignKey(
    queryRunner: QueryRunner,
    constraintName: string,
    createSql: string,
  ): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_schema = DATABASE() AND constraint_name = ?
       LIMIT 1`,
      [constraintName],
    )) as unknown as Array<Record<string, unknown>>;
    if (!rows.length) {
      try {
        await queryRunner.query(createSql);
      } catch (e) {
        const msg = String((e as { message?: string })?.message ?? e);
        if (!msg.includes('Duplicate')) throw e;
      }
    }
  }
}
