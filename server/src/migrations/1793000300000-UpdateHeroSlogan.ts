import { MigrationInterface, QueryRunner } from 'typeorm';

/** 更新已保存的官网首屏中英文品牌标语。 */
export class UpdateHeroSlogan1793000300000 implements MigrationInterface {
  name = 'UpdateHeroSlogan1793000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`stores\`
      SET \`siteContent\` = JSON_SET(
        \`siteContent\`,
        '$.translations.zh.hero_slogan', 'IDOL BEADS， 与快乐同行',
        '$.translations.en.hero_slogan', 'IDOL BEADS, joy every step of the way'
      )
      WHERE \`siteContent\` IS NOT NULL
        AND (
          JSON_UNQUOTE(JSON_EXTRACT(\`siteContent\`, '$.translations.zh.hero_slogan')) = '一粒粒豆子，组成属于自己的王国'
          OR JSON_UNQUOTE(JSON_EXTRACT(\`siteContent\`, '$.translations.en.hero_slogan')) = 'Bead by bead, building a kingdom of your own'
        )
    `);
  }

  public async down(): Promise<void> {
    // 品牌文案更新不回滚为旧标语。
  }
}
