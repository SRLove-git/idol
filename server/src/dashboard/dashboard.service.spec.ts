import { createHash } from 'crypto';
import { DashboardService } from './dashboard.service';

describe('DashboardService website visits', () => {
  it('stores only a hash of the anonymous visitor id and ignores same-day duplicates', async () => {
    const execute = jest.fn().mockResolvedValue({ identifiers: [] });
    const updateEntity = jest.fn().mockReturnValue({ execute });
    const orIgnore = jest.fn().mockReturnValue({ updateEntity });
    const values = jest.fn().mockReturnValue({ orIgnore });
    const insert = jest.fn().mockReturnValue({ values });
    const siteVisitRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({ insert }),
    };
    const service = new DashboardService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      siteVisitRepo as never,
    );

    await service.recordVisit('browser_visitor_123456', '/booking');

    expect(values).toHaveBeenCalledWith({
      visitorHash: createHash('sha256')
        .update('browser_visitor_123456')
        .digest('hex'),
      visitDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      entryPath: '/booking',
    });
    expect(orIgnore).toHaveBeenCalledTimes(1);
    expect(updateEntity).toHaveBeenCalledWith(false);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('does not store an invalid entry path', async () => {
    const execute = jest.fn().mockResolvedValue({ identifiers: [] });
    const updateEntity = jest.fn().mockReturnValue({ execute });
    const values = jest.fn().mockReturnValue({
      orIgnore: () => ({ updateEntity }),
    });
    const siteVisitRepo = {
      createQueryBuilder: () => ({
        insert: () => ({ values }),
      }),
    };
    const service = new DashboardService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      siteVisitRepo as never,
    );

    await service.recordVisit('browser_visitor_123456', 'https://example.com');

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ entryPath: '/' }),
    );
  });
});
