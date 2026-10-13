import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { marketingCampaignEmail } from '../email/email.templates';
import { EmailService } from '../email/email.service';
import { User } from '../users/user.entity';
import { SendMarketingEmailDto } from './marketing-email.dto';
import { MarketingEmailCampaign } from './marketing-email-campaign.entity';

@Injectable()
export class MarketingEmailService {
  private readonly logger = new Logger(MarketingEmailService.name);

  constructor(
    @InjectRepository(MarketingEmailCampaign)
    private readonly campaigns: Repository<MarketingEmailCampaign>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly email: EmailService,
  ) {}

  async summary() {
    const subscriberCount = await this.users
      .createQueryBuilder('user')
      .where('user.marketingEmailConsent = :consent', { consent: true })
      .andWhere('user.isBanned = :banned', { banned: false })
      .andWhere('user.email IS NOT NULL')
      .andWhere("TRIM(user.email) <> ''")
      .getCount();
    return { subscriberCount };
  }

  async list(page = 1, pageSize = 20) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(50, Math.max(1, pageSize));
    const [items, total] = await this.campaigns.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    });
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async send(dto: SendMarketingEmailDto, adminId: number) {
    if (Boolean(dto.ctaLabel) !== Boolean(dto.ctaUrl)) {
      throw new BadRequestException('按钮文字和按钮链接需要同时填写');
    }
    const existing = await this.campaigns.findOneBy({
      requestKey: dto.requestKey,
    });
    if (existing) return existing;

    const rows = await this.users
      .createQueryBuilder('user')
      .select('LOWER(user.email)', 'email')
      .where('user.marketingEmailConsent = :consent', { consent: true })
      .andWhere('user.isBanned = :banned', { banned: false })
      .andWhere('user.email IS NOT NULL')
      .andWhere("TRIM(user.email) <> ''")
      .groupBy('LOWER(user.email)')
      .getRawMany<{ email: string }>();

    const recipients = rows.map((row) => row.email).filter(Boolean);
    if (!recipients.length) {
      throw new BadRequestException('当前没有已同意营销邮件的有效收件人');
    }

    let campaign = this.campaigns.create({
      requestKey: dto.requestKey,
      subject: dto.subject,
      preheader: dto.preheader ?? '',
      heading: dto.heading,
      body: dto.body,
      ctaLabel: dto.ctaLabel ?? '',
      ctaUrl: dto.ctaUrl ?? '',
      status: 'sending',
      recipientCount: recipients.length,
      sentCount: 0,
      failedCount: 0,
      createdBy: adminId,
      completedAt: null,
    });

    try {
      campaign = await this.campaigns.save(campaign);
    } catch (error) {
      const duplicate = await this.campaigns.findOneBy({
        requestKey: dto.requestKey,
      });
      if (duplicate) return duplicate;
      throw error;
    }

    const content = marketingCampaignEmail({
      preheader: dto.preheader,
      heading: dto.heading,
      body: dto.body,
      ctaLabel: dto.ctaLabel,
      ctaUrl: dto.ctaUrl,
    });

    let sentCount = 0;
    let failedCount = 0;
    const batchSize = 5;
    for (let index = 0; index < recipients.length; index += batchSize) {
      const results = await Promise.allSettled(
        recipients
          .slice(index, index + batchSize)
          .map((recipient) => this.email.send(recipient, dto.subject, content)),
      );
      sentCount += results.filter((result) => result.status === 'fulfilled').length;
      failedCount += results.filter((result) => result.status === 'rejected').length;
    }

    campaign.sentCount = sentCount;
    campaign.failedCount = failedCount;
    campaign.status = failedCount === 0 ? 'completed' : sentCount > 0 ? 'partial' : 'failed';
    campaign.completedAt = new Date();
    campaign = await this.campaigns.save(campaign);
    this.logger.log(
      `营销邮件群发完成 #${campaign.id}: ${sentCount}/${recipients.length} 成功`,
    );
    return campaign;
  }
}
