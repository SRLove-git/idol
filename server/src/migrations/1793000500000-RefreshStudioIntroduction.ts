import { MigrationInterface, QueryRunner } from 'typeorm';

/** 将已保存的官网文案同步为最新门店介绍。 */
export class RefreshStudioIntroduction1793000500000
  implements MigrationInterface
{
  name = 'RefreshStudioIntroduction1793000500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const zh = {
      feat1_title: '专业烫印',
      feat1_desc:
        '店内使用全自动烫画机和手持烫画机，提供 30 多种特殊烫。工作人员会帮你完成最后的烫步骤，尽力做好作品。',
      feat2_title: '免费工具',
      feat2_desc:
        '店内工具齐全，全尺寸双九华长钉板，配备弯/直头镊子、多规格道豆铲、立豆盘、挖豆勺。还有市面上有口皆碑的单针、双针（60 针、70 针、80 针、陶瓷针），以及生煎包自动下豆笔。',
      feat3_title: 'DIY 成品',
      feat3_desc:
        '成品可做钥匙扣、冰箱贴、卡包、护照夹、扇子，并提供轴承、支架等配件。',
      feat4_title: '小红书集赞赢会员',
      feat4_desc:
        '在小红书发布本店作品、体验或探店内容，带上话题 #IDOL Beads #新加坡拼豆 并 @IDOL Beads。集满 30/60/100 及以上赞，分别赠送 1/2/3 个月会员资格。仅限本店顾客、公开笔记，每个账号每月限参与 1 次，集赞达标后截图给店员核对，活动最终解释权归本店所有。',
      studio_location:
        '牛车水解压手工好去处 · 适合放空与朋友小聚',
    };
    const en = {
      feat1_title: 'Professional Ironing',
      feat1_desc:
        'We use both automatic and handheld heat presses, with over 30 special ironing finishes available. Our team will complete the final ironing steps and do their best to finish your creation beautifully.',
      feat2_title: 'Free Tools',
      feat2_desc:
        'Our complete tool selection includes full-size Shuangjiuhua long-peg boards, angled and straight tweezers, bead scoops in multiple sizes, upright bead trays and bead spoons. Popular tools include single-needle and dual-needle pens (60, 70, 80 and ceramic needles), plus Shengjianbao automatic bead dispensers.',
      feat3_title: 'DIY Finished Pieces',
      feat3_desc:
        'Turn your creation into a keyring, fridge magnet, card holder, passport holder or fan, with bearings, stands and other accessories also available.',
      feat4_title: 'RedNote Likes for Membership',
      feat4_desc:
        'Post your creation, studio experience or store visit on RedNote with #IDOL Beads, #SingaporePerlerBeads and @IDOL Beads. Earn 30, 60, or 100+ likes to receive 1, 2, or 3 months of membership. Open to IDOL Beads customers with public posts; one redemption per account each month. Show a screenshot to our team once your likes reach the target. Final interpretation of the promotion rests with the studio.',
      studio_location:
        'A relaxing Chinatown craft spot · Perfect for unwinding and meeting friends',
    };

    await queryRunner.query(
      `
        UPDATE \`stores\`
        SET \`siteContent\` = JSON_SET(
          \`siteContent\`,
          '$.translations.zh', JSON_MERGE_PATCH(
            COALESCE(JSON_EXTRACT(\`siteContent\`, '$.translations.zh'), JSON_OBJECT()),
            CAST(? AS JSON)
          ),
          '$.translations.en', JSON_MERGE_PATCH(
            COALESCE(JSON_EXTRACT(\`siteContent\`, '$.translations.en'), JSON_OBJECT()),
            CAST(? AS JSON)
          )
        )
        WHERE \`name\` = 'IDOL BEADS' AND \`siteContent\` IS NOT NULL
      `,
      [JSON.stringify(zh), JSON.stringify(en)],
    );

    await queryRunner.query(`
      UPDATE \`stores\`
      SET \`siteContent\` = JSON_SET(
        \`siteContent\`,
        '$.reviews[1].quoteZh',
        '牛车水里的宝藏拼豆店，特殊烫款式很丰富，涵盖市面上常见的 30 多种特殊烫，选图的时候就已经很快乐。',
        '$.reviews[1].quoteEn',
        'A Chinatown gem with an extensive range of special ironing styles, including more than 30 popular finishes. Choosing a design is part of the fun.'
      )
      WHERE \`name\` = 'IDOL BEADS'
        AND \`siteContent\` IS NOT NULL
        AND JSON_CONTAINS_PATH(\`siteContent\`, 'one', '$.reviews[1]')
    `);
  }

  public async down(): Promise<void> {
    // 官网介绍更新不回滚为旧文案。
  }
}
