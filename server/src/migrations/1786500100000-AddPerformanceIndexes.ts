import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomInt } from 'crypto';

/**
 * 上线前性能优化：补齐高频查询索引 + 用户搜索 FULLTEXT（ngram）。
 *
 * 索引名与实体 @Index() 生成的哈希一致，避免后续 migration:generate 误报差异；
 * 创建前按 information_schema 判存在，重复执行安全。
 */
export class AddPerformanceIndexes1786500100000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1786500100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) 浏览历史去重：唯一索引 (userId, targetId) 建立前，先清理历史重复行（保留最小 id）
    await queryRunner.query(`
      DELETE bh FROM browsing_history bh
      JOIN browsing_history bh2
        ON bh2.userId = bh.userId AND bh2.postId = bh.postId AND bh2.id < bh.id
    `);
    await queryRunner.query(`
      DELETE bh FROM video_browsing_history bh
      JOIN video_browsing_history bh2
        ON bh2.userId = bh.userId AND bh2.videoId = bh.videoId AND bh2.id < bh.id
    `);

    // 2) 预约码去重：唯一索引前，给重复码重新生成（保留最早一条）
    const dupCodes = (await queryRunner.query(`
      SELECT code, COUNT(*) AS cnt FROM appointments
      GROUP BY code HAVING cnt > 1
    `)) as Array<{ code: string }>;
    for (const dup of dupCodes) {
      const rows = (await queryRunner.query(
        'SELECT id FROM appointments WHERE code = ? ORDER BY id ASC',
        [dup.code],
      )) as Array<{ id: number }>;
      for (let i = 1; i < rows.length; i++) {
        let next: string | null = null;
        for (let attempt = 0; attempt < 10 && next == null; attempt++) {
          const candidate = String(randomInt(0, 1_000_000)).padStart(6, '0');
          const exists = (await queryRunner.query(
            'SELECT id FROM appointments WHERE code = ? LIMIT 1',
            [candidate],
          )) as Array<{ id: number }>;
          if (!exists.length) next = candidate;
        }
        if (next == null) {
          throw new Error(
            `预约码去重失败：无法为预约单 ${rows[i].id} 生成新码`,
          );
        }
        await queryRunner.query(
          'UPDATE appointments SET code = ? WHERE id = ?',
          [next, rows[i].id],
        );
      }
    }

    // 3) 高频查询索引（均带存在性保护）
    await this.ensureIndex(
      queryRunner,
      'appointments',
      'IDX_cb06e7c9af0d52d978fb1073d5',
      'CREATE INDEX `IDX_cb06e7c9af0d52d978fb1073d5` ON `appointments` (`userId`, `createdAt`)',
    );
    await this.ensureIndex(
      queryRunner,
      'appointments',
      'IDX_d838dde2371446d33c990332cb',
      'CREATE UNIQUE INDEX `IDX_d838dde2371446d33c990332cb` ON `appointments` (`code`)',
    );
    await this.ensureIndex(
      queryRunner,
      'browsing_history',
      'IDX_36d9d03bc224c4478e88a80a21',
      'CREATE INDEX `IDX_36d9d03bc224c4478e88a80a21` ON `browsing_history` (`userId`, `createdAt`)',
    );
    await this.ensureIndex(
      queryRunner,
      'browsing_history',
      'IDX_6652fad3777c2e6b19fd1854ab',
      'CREATE UNIQUE INDEX `IDX_6652fad3777c2e6b19fd1854ab` ON `browsing_history` (`userId`, `postId`)',
    );
    await this.ensureIndex(
      queryRunner,
      'video_browsing_history',
      'IDX_7e25ff10da168652f230ce1242',
      'CREATE INDEX `IDX_7e25ff10da168652f230ce1242` ON `video_browsing_history` (`userId`, `createdAt`)',
    );
    await this.ensureIndex(
      queryRunner,
      'video_browsing_history',
      'IDX_f0ec44184af98531e647de0cd2',
      'CREATE UNIQUE INDEX `IDX_f0ec44184af98531e647de0cd2` ON `video_browsing_history` (`userId`, `videoId`)',
    );
    await this.ensureIndex(
      queryRunner,
      'notifications',
      'IDX_feeec080f7996b1b9a455f218e',
      'CREATE INDEX `IDX_feeec080f7996b1b9a455f218e` ON `notifications` (`sent`, `createdAt`)',
    );
    await this.ensureIndex(
      queryRunner,
      'videos',
      'IDX_b2eed609945c1dcf905aa75bad',
      'CREATE INDEX `IDX_b2eed609945c1dcf905aa75bad` ON `videos` (`status`, `createdAt`)',
    );
    await this.ensureIndex(
      queryRunner,
      'posts',
      'IDX_88a7b458a43b57e29e37e26f1b',
      'CREATE INDEX `IDX_88a7b458a43b57e29e37e26f1b` ON `posts` (`status`, `createdAt`)',
    );
    // member_orders：删除旧的单列 userId 索引，换成 (userId, createdAt) 复合索引
    const oldOrderIdx = (await queryRunner.query(
      `SELECT index_name FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = 'member_orders'
         AND column_name = 'userId' AND index_name <> 'IDX_2d87f4e60a50e745a7bb11b83a'
       GROUP BY index_name`,
    )) as Array<{ index_name?: string; INDEX_NAME?: string }>;
    for (const row of oldOrderIdx) {
      // information_schema.statistics 返回的列名可能为大写 INDEX_NAME
      const idxName = row.index_name ?? row.INDEX_NAME;
      await queryRunner.query(`DROP INDEX \`${idxName}\` ON \`member_orders\``);
    }
    await this.ensureIndex(
      queryRunner,
      'member_orders',
      'IDX_2d87f4e60a50e745a7bb11b83a',
      'CREATE INDEX `IDX_2d87f4e60a50e745a7bb11b83a` ON `member_orders` (`userId`, `createdAt`)',
    );

    // 4) 用户搜索 FULLTEXT（ngram 支持中文分词；索引列与 MATCH 查询一致）
    await this.ensureIndex(
      queryRunner,
      'users',
      'ft_users_search',
      'CREATE FULLTEXT INDEX `ft_users_search` ON `users` (`username`, `email`, `nickname`) WITH PARSER ngram',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_cb06e7c9af0d52d978fb1073d5` ON `appointments`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_d838dde2371446d33c990332cb` ON `appointments`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_36d9d03bc224c4478e88a80a21` ON `browsing_history`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_6652fad3777c2e6b19fd1854ab` ON `browsing_history`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_7e25ff10da168652f230ce1242` ON `video_browsing_history`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_f0ec44184af98531e647de0cd2` ON `video_browsing_history`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_feeec080f7996b1b9a455f218e` ON `notifications`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b2eed609945c1dcf905aa75bad` ON `videos`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_88a7b458a43b57e29e37e26f1b` ON `posts`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_2d87f4e60a50e745a7bb11b83a` ON `member_orders`',
    );
    await queryRunner.query('DROP INDEX `ft_users_search` ON `users`');
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
