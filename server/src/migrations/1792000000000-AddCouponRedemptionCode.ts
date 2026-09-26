import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomInt } from 'crypto';

/**
 * 优惠券核销码：user_coupons 增加 6 位数字核销码（领取时生成，到店核销凭证）
 * 与核销人字段；历史已领取的券回填唯一核销码。
 */
export class AddCouponRedemptionCode1792000000000 implements MigrationInterface {
  name = 'AddCouponRedemptionCode1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user_coupons\` ADD \`code\` varchar(10) NULL, ADD \`redeemedBy\` int NULL`,
    );

    // 历史数据回填：为已领取的券补生成唯一 6 位核销码
    const rows = (await queryRunner.query(
      'SELECT `id` FROM `user_coupons`',
    )) as Array<{ id: number }>;
    for (const row of rows) {
      const code = await this.nextCode(queryRunner);
      await queryRunner.query(
        'UPDATE `user_coupons` SET `code` = ? WHERE `id` = ?',
        [code, Number(row.id)],
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`user_coupons\` MODIFY \`code\` varchar(10) NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_user_coupons_code\` ON \`user_coupons\` (\`code\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_user_coupons_code\` ON \`user_coupons\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_coupons\` DROP COLUMN \`code\`, DROP COLUMN \`redeemedBy\``,
    );
  }

  private async nextCode(queryRunner: QueryRunner): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      const existing = (await queryRunner.query(
        'SELECT COUNT(*) AS `n` FROM `user_coupons` WHERE `code` = ?',
        [code],
      )) as Array<{ n: string | number }>;
      // mysql2 默认将 COUNT 作为字符串返回，需显式转数字再判断
      if (Number(existing[0]?.n) === 0) return code;
    }
    throw new Error('生成核销码失败');
  }
}
