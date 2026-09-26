import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { hashPassword } from '../auth/password.util';
import { MembersService } from '../members/members.service';
import { MusicService } from '../music/music.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StoresService } from '../stores/stores.service';
import { UsersService } from '../users/users.service';
import { VideosService } from '../videos/videos.service';

/** 开发环境预置的演示作者（避免与真实注册用户名冲突） */
interface DemoAuthor {
  username: string;
  email: string;
  nickname: string;
  avatar: string;
}

/** 开发环境预置的演示短视频 */
interface DemoVideo {
  authorUsername: string;
  title: string;
  cover: string;
  videoUrl: string;
  duration: number;
  music: string;
  tags: string[];
}

/** 演示作者 */
const DEMO_AUTHORS: DemoAuthor[] = [
  {
    username: 'zhuzhu',
    email: 'demo.zhu@example.com',
    nickname: '珠珠',
    avatar: 'https://i.pravatar.cc/150?img=33',
  },
  {
    username: 'pindou_xiaoj',
    email: 'demo.pindou@example.com',
    nickname: '拼豆小匠',
    avatar: 'https://i.pravatar.cc/150?img=12',
  },
  {
    username: 'chuanchuan',
    email: 'demo.chuan@example.com',
    nickname: '串串',
    avatar: 'https://i.pravatar.cc/150?img=45',
  },
];

/** 演示短视频（封面走 picsum 占位服务；视频流为 assets/demo 下的真实 mp4） */
const DEMO_VIDEOS: DemoVideo[] = [
  {
    authorUsername: 'zhuzhu',
    title:
      '拼豆新手第一课：镊子怎么夹才稳？摆豆不歪的 3 个小技巧，小白 10 分钟上手。',
    cover: 'https://picsum.photos/seed/diyseed1/720/1280',
    videoUrl: '/assets/demo/demo-01.mp4',
    duration: 15,
    music: '《豆豆乐园》- 拼豆 BGM',
    tags: ['拼豆', '新手教程', '摆豆技巧'],
  },
  {
    authorUsername: 'pindou_xiaoj',
    title: '串珠手链 12 颗菩提 + 绿松石，闺蜜戴出去被问了一路在哪买的！',
    cover: 'https://picsum.photos/seed/diyseed2/720/1280',
    videoUrl: '/assets/demo/demo-02.mp4',
    duration: 12,
    music: '《珠光》- 轻快手作',
    tags: ['串珠', '手链', '闺蜜礼物'],
  },
  {
    authorUsername: 'chuanchuan',
    title: '拼豆定型翻车现场：温度太高豆子直接化成一滩…下次记得先垫烫纸！',
    cover: 'https://picsum.photos/seed/diyseed3/720/1280',
    videoUrl: '/assets/demo/demo-03.mp4',
    duration: 15,
    music: '《拼豆节拍》- 卡点神曲',
    tags: ['拼豆', '定型', '翻车现场'],
  },
  {
    authorUsername: 'zhuzhu',
    title: '第一次做立体拼豆，从图纸到成品全程 9:16 卡点，看得停不下来。',
    cover: 'https://picsum.photos/seed/diyseed4/720/1280',
    videoUrl: '/assets/demo/demo-04.mp4',
    duration: 14,
    music: '《手作时光》- 氛围音乐',
    tags: ['立体拼豆', '卡点', '手作'],
  },
  {
    authorUsername: 'pindou_xiaoj',
    title: '拼豆像素图怎么设计？用手机画图软件 3 分钟搞定图纸，附配色思路。',
    cover: 'https://picsum.photos/seed/diyseed5/720/1280',
    videoUrl: '/assets/demo/demo-05.mp4',
    duration: 13,
    music: '《串珠小调》- 手工串珠',
    tags: ['拼豆', '图纸设计', '教程'],
  },
  {
    authorUsername: 'chuanchuan',
    title: '串珠耳饰新手避坑：选珠、穿线、收尾三件套，别再买错材料啦！',
    cover: 'https://picsum.photos/seed/diyseed6/720/1280',
    videoUrl: '/assets/demo/demo-06.mp4',
    duration: 15,
    music: '《彩珠圆舞曲》- 轻音乐',
    tags: ['串珠', '耳饰', '新手避坑'],
  },
];

/** 开发环境预置的演示配乐 */
interface DemoMusic {
  title: string;
  artist: string;
  duration: number;
  /** 音频 URL；缺省时回退到 SoundHelix 公共示例 */
  musicUrl?: string;
}

/** 演示配乐（音频走 SoundHelix 公共示例，客户端可试听） */
const DEMO_MUSIC: DemoMusic[] = [
  { title: '豆豆乐园', artist: '拼豆 BGM', duration: 180 },
  { title: '珠光', artist: '轻快手作', duration: 120 },
  { title: '拼豆节拍', artist: '卡点神曲', duration: 150 },
  { title: '串珠小调', artist: '手工串珠', duration: 90 },
  { title: '彩珠圆舞曲', artist: '轻音乐', duration: 200 },
  { title: '手作时光', artist: '氛围音乐', duration: 130 },
  {
    title: '1000 Funk Songs (In A Day)',
    artist: 'Thomas Park',
    duration: 192,
    musicUrl: '/assets/music/thomas-park-1000-funk-songs.mp3',
  },
];

/** 启动初始化：开发环境预置管理员账号 + 演示短视频 */
@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);
  private readonly ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  private readonly ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
  // 生产必须显式配置初始密码；未配置时跳过自动创建，避免默认弱口令上线
  private readonly ADMIN_PASSWORD =
    process.env.ADMIN_INITIAL_PASSWORD ||
    (process.env.NODE_ENV === 'production' ? '' : 'admin123456');
  /** 审核演示种子：仅 REVIEW_DEMO_ENABLED=true 时创建（提交 App Store 审核前开启） */
  private readonly REVIEW_DEMO_ENABLED =
    process.env.REVIEW_DEMO_ENABLED === 'true';
  private readonly REVIEW_DEMO_USERNAME =
    process.env.REVIEW_DEMO_USERNAME || 'reviewdemo';
  private readonly REVIEW_DEMO_PASSWORD =
    process.env.REVIEW_DEMO_PASSWORD || 'ThinkOrigin#2026';
  private readonly REVIEW_DEMO_EMAIL =
    process.env.REVIEW_DEMO_EMAIL || 'reviewdemo@thinkorigin.example';

  constructor(
    private readonly users: UsersService,
    private readonly videos: VideosService,
    private readonly music: MusicService,
    private readonly notifications: NotificationsService,
    private readonly stores: StoresService,
    private readonly members: MembersService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureAdmin();
    if (process.env.NODE_ENV === 'production' && !this.REVIEW_DEMO_ENABLED) {
      return;
    }
    if (this.REVIEW_DEMO_ENABLED) {
      await this.seedReviewDemo();
      await this.ensureReviewPlans();
      this.logger.log(
        `REVIEW_DEMO_ENABLED=true：已确保审核演示账号 ${this.REVIEW_DEMO_USERNAME} 与门店数据就绪`,
      );
    }
    await this.seedDemoVideos();
    await this.seedDemoMusic();
    await this.seedDemoNotifications();
  }

  /**
   * 审核演示种子（幂等）：创建 reviewdemo 账号并确保 IDOL BEADS 门店
   * 具备桌位、时段与时长套餐，供 App Store 审核员直接体验完整预约流程。
   */
  private async seedReviewDemo() {
    let user = await this.users.findByUsername(this.REVIEW_DEMO_USERNAME);
    if (!user) {
      user = await this.users.create({
        username: this.REVIEW_DEMO_USERNAME,
        email: this.REVIEW_DEMO_EMAIL,
        passwordHash: await hashPassword(this.REVIEW_DEMO_PASSWORD),
        nickname: '审核演示账号',
      });
      this.logger.log(
        `已创建审核演示账号：${this.REVIEW_DEMO_USERNAME} / ${this.REVIEW_DEMO_PASSWORD}`,
      );
    } else if (!user.passwordHash) {
      await this.users.setPasswordHash(
        user.id,
        await hashPassword(this.REVIEW_DEMO_PASSWORD),
      );
      this.logger.log(`审核演示账号 ${this.REVIEW_DEMO_USERNAME} 已补全密码`);
    }

    let store = await this.stores.findByName('IDOL BEADS');
    if (!store) {
      store = await this.stores.create({
        name: 'IDOL BEADS',
        address: '18A, Sago Street, Singapore 059017',
        price: 9.9,
        memberPrice: 7.92,
        groupPrice: 8.5,
        allDayPrice: 39.9,
        allDayMemberPrice: 31.92,
        allDayGroupPrice: 34,
        businessHours: '10:00-21:00',
        phone: '+65 8381 1666',
        rating: 5,
        images: [],
      });
      this.logger.log('已创建审核演示门店：IDOL BEADS（18A Sago Street）');
    }

    const detail = await this.stores.adminDetail(store.id);
    if (!detail.tables.length) {
      await this.stores.addTable(store.id, { capacity: 1 });
      await this.stores.addTable(store.id, { capacity: 2 });
      await this.stores.addTable(store.id, { capacity: 2 });
      await this.stores.addTable(store.id, { capacity: 4 });
      this.logger.log('已为 IDOL BEADS 预置 4 张桌位（A1/B1/B2/C1）');
    }
    if (!detail.slots.length) {
      for (const [startTime, endTime] of [
        ['10:00', '12:00'],
        ['13:00', '15:00'],
        ['15:00', '17:00'],
        ['19:00', '21:00'],
      ]) {
        await this.stores.addSlot(store.id, { startTime, endTime });
      }
      this.logger.log('已为 IDOL BEADS 预置 4 个可约时段');
    }
    if (!detail.packages.length) {
      await this.stores.addPackage(store.id, {
        name: '6 小时畅玩套餐',
        hours: 6,
        price: 49.9,
        memberPrice: 39.9,
        groupPrice: 45,
      });
      this.logger.log('已为 IDOL BEADS 预置 6 小时畅玩套餐');
    }
  }

  /**
   * 审核演示会员套餐（幂等）：把会员计划同步为新加坡区营销文案价格
   * （S$19.90 月卡 / S$49 季卡 / S$149 年卡），避免审核员看到的
   * App 内价格与 App Store 描述/Notes 不一致。仅 REVIEW_DEMO_ENABLED=true 时执行。
   */
  private async ensureReviewPlans() {
    const targets = [
      {
        name: '月卡',
        durationDays: 30,
        price: 19.9,
        originalPrice: 29.9,
        benefits: ['全场 8 折', '每月专属优惠券'],
        badge: '',
        recommended: false,
      },
      {
        name: '季卡',
        durationDays: 90,
        price: 49,
        originalPrice: 87,
        benefits: ['全场 8 折', '每月专属优惠券', '专属活动优先报名'],
        badge: '推荐',
        recommended: true,
      },
      {
        name: '年卡',
        durationDays: 365,
        price: 149,
        originalPrice: 298,
        benefits: [
          '全场 8 折',
          '每月专属优惠券',
          '专属活动优先报名',
          '生日当月免费体验一次',
        ],
        badge: '最划算',
        recommended: false,
      },
    ];
    const existing = await this.members.listPlans(true);
    for (const t of targets) {
      const plan = existing.find((p) => p.name === t.name);
      await this.members.savePlan({ ...t, enabled: true }, plan?.id);
    }
    this.logger.log(
      '已同步审核演示会员套餐为新加坡区价格（月卡 S$19.9 / 年卡 S$149）',
    );
  }

  private async ensureAdmin() {
    if (process.env.NODE_ENV === 'production' && !this.ADMIN_PASSWORD) {
      this.logger.warn(
        '生产环境未配置 ADMIN_INITIAL_PASSWORD，跳过自动创建管理员；' +
          '请通过环境变量注入初始管理员或手动在库中创建 role=admin 的账号',
      );
      return;
    }
    let admin = await this.users.findByUsername(this.ADMIN_USERNAME);
    if (!admin) {
      // 兼容旧版手机号体系遗留的管理员：补全用户名/邮箱/密码，避免重复建号
      admin = await this.users.findLegacyAdmin();
      if (admin) {
        await this.users.updateProfile(admin.id, {
          username: this.ADMIN_USERNAME,
        });
        this.logger.log(
          `已将旧管理员迁移为 ${this.ADMIN_USERNAME}（密码 ${this.ADMIN_PASSWORD}）`,
        );
      }
    }
    if (!admin) {
      admin = await this.users.create({
        username: this.ADMIN_USERNAME,
        email: this.ADMIN_EMAIL,
        passwordHash: await hashPassword(this.ADMIN_PASSWORD),
        role: 'admin',
        adminRole: 'super_admin',
        nickname: '管理员',
      });
      this.logger.log(
        `已创建开发管理员账号：${this.ADMIN_USERNAME} / ${this.ADMIN_PASSWORD}（admin）`,
      );
    } else if (admin.role !== 'admin') {
      await this.users.setRole(admin.id, 'admin');
      this.logger.log(`已将 ${this.ADMIN_USERNAME} 角色更新为 admin`);
    }
    if (!admin.adminRole) {
      await this.users.setAdminRole(admin.id, 'super_admin');
      this.logger.log(`已将 ${this.ADMIN_USERNAME} 设为 super_admin`);
    }
    if (!admin.passwordHash) {
      await this.users.setPasswordHash(
        admin.id,
        await hashPassword(this.ADMIN_PASSWORD),
      );
    }
  }

  /** 短视频表为空时预置演示数据，保证信息流可演示 */
  private async seedDemoVideos() {
    const count = await this.videos.countVideos();
    if (count === 0) {
      // 创建/复用演示作者并补齐昵称头像
      const authorByUsername = new Map<string, number>();
      for (const a of DEMO_AUTHORS) {
        const user = await this.users.findByUsernameOrCreate(a);
        await this.users.updateProfile(user.id, {
          nickname: a.nickname,
          avatar: a.avatar,
        });
        authorByUsername.set(a.username, user.id);
      }

      for (const v of DEMO_VIDEOS) {
        const userId = authorByUsername.get(v.authorUsername);
        if (!userId) continue;
        await this.videos.create(userId, {
          title: v.title,
          content: v.title,
          cover: v.cover,
          videoUrl: v.videoUrl,
          duration: v.duration,
          music: v.music,
          tags: v.tags,
        });
      }
      this.logger.log(`已预置 ${DEMO_VIDEOS.length} 条演示短视频`);
    }

    // 兼容旧演示数据：把「封面图当视频流」的历史种子行修复为真实视频
    const repaired = await this.videos.repairImageVideos(
      DEMO_VIDEOS.map((v) => ({
        videoUrl: v.videoUrl,
        duration: v.duration,
      })),
    );
    if (repaired > 0) {
      this.logger.log(`已将 ${repaired} 条旧演示视频修复为真实视频`);
    }
  }

  /** 曲库为空时按曲目预置演示配乐（按歌名+歌手去重，保证拍摄页可选） */
  private async seedDemoMusic() {
    for (let i = 0; i < DEMO_MUSIC.length; i++) {
      const m = DEMO_MUSIC[i];
      const exists = await this.music.findByTitleArtist(m.title, m.artist);
      if (exists) continue;
      await this.music.create({
        title: m.title,
        artist: m.artist,
        duration: m.duration,
        musicUrl:
          m.musicUrl ??
          `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${i + 1}.mp3`,
      });
    }
    this.logger.log('已确保预置演示配乐就绪');
  }

  /** 通知表为空时预置全员通知，便于首页角标/通知页演示 */
  private async seedDemoNotifications() {
    const count = await this.notifications.countAll();
    if (count > 0) return;
    await this.notifications.createAndSend({
      title: '欢迎来到 IDOL BEADS 拼豆乐园',
      content: '新用户专享体验价 $39.9/次起，快去预约你的第一次拼豆体验吧！',
      titleEn: 'Welcome to IDOL BEADS Bead Art Studio',
      contentEn:
        'New users enjoy an exclusive trial from $39.9/session. Book your first bead art experience now!',
      category: 'system',
      targetType: 'all',
      channels: 'push',
    });
    await this.notifications.createAndSend({
      title: '拼豆作品征集活动开启',
      content: '发布你的拼豆作品参与评选，人气作品将获得门店专属体验券。',
      titleEn: 'Bead Art Contest Is Live',
      contentEn:
        'Publish your bead art to join the contest. Popular works will earn an exclusive in-store trial voucher.',
      category: 'system',
      targetType: 'all',
      channels: 'push',
    });
    this.logger.log('已预置演示通知');
  }
}
