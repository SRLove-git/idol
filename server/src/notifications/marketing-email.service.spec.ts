import type { Repository } from 'typeorm';
import type { EmailService } from '../email/email.service';
import type { User } from '../users/user.entity';
import type { MarketingEmailCampaign } from './marketing-email-campaign.entity';
import { MarketingEmailService } from './marketing-email.service';

describe('MarketingEmailService', () => {
  const queryBuilder = {
    select: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    groupBy: jest.fn(),
    getRawMany: jest.fn(),
    getCount: jest.fn(),
  };
  const campaigns = {
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
  };
  const users = { createQueryBuilder: jest.fn(() => queryBuilder) };
  const email = { send: jest.fn() };

  let service: MarketingEmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(queryBuilder).forEach((method) => {
      if (method !== queryBuilder.getRawMany && method !== queryBuilder.getCount) {
        method.mockReturnValue(queryBuilder);
      }
    });
    campaigns.findOneBy.mockResolvedValue(null);
    campaigns.save.mockImplementation(async (value) => ({ id: 1, ...value }));
    email.send.mockResolvedValue(undefined);
    service = new MarketingEmailService(
      campaigns as unknown as Repository<MarketingEmailCampaign>,
      users as unknown as Repository<User>,
      email as unknown as EmailService,
    );
  });

  const dto = {
    requestKey: 'd65a7ab4-c258-4d25-a325-8c95356b6f61',
    subject: '周末活动',
    preheader: '来一起拼豆',
    heading: '周末见',
    body: '我们准备了新的图纸。',
    ctaLabel: '查看详情',
    ctaUrl: 'https://idol-sg.com',
    confirmation: 'SEND' as const,
  };

  it('sends separately only to distinct opted-in recipients and records success', async () => {
    queryBuilder.getRawMany.mockResolvedValue([
      { email: 'a@example.com' },
      { email: 'b@example.com' },
    ]);

    const result = await service.send(dto, 9);

    expect(email.send).toHaveBeenCalledTimes(2);
    expect(email.send.mock.calls.map((call) => call[0])).toEqual([
      'a@example.com',
      'b@example.com',
    ]);
    expect(result).toMatchObject({
      status: 'completed',
      recipientCount: 2,
      sentCount: 2,
      failedCount: 0,
      createdBy: 9,
    });
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'user.marketingEmailConsent = :consent',
      { consent: true },
    );
  });

  it('does not send again when the request key already exists', async () => {
    campaigns.findOneBy.mockResolvedValue({ id: 22, status: 'completed' });

    const result = await service.send(dto, 9);

    expect(result).toEqual({ id: 22, status: 'completed' });
    expect(users.createQueryBuilder).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });

  it('records a partial result without exposing recipients to each other', async () => {
    queryBuilder.getRawMany.mockResolvedValue([
      { email: 'a@example.com' },
      { email: 'b@example.com' },
    ]);
    email.send
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('SMTP unavailable'));

    const result = await service.send(dto, 9);

    expect(result).toMatchObject({
      status: 'partial',
      sentCount: 1,
      failedCount: 1,
    });
    expect(email.send.mock.calls.every((call) => typeof call[0] === 'string')).toBe(true);
  });
});
