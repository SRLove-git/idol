import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';

function buildService(
  overrides: {
    activity?: unknown;
    bookings?: number;
  } = {},
) {
  const activities = {
    findOneBy: jest
      .fn()
      .mockResolvedValue(
        overrides.activity !== undefined
          ? overrides.activity
          : { id: 1, title: '测试活动' },
      ),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const appointments = {
    countBy: jest.fn().mockResolvedValue(overrides.bookings ?? 0),
  };
  const sessions = {};
  const svc = new ActivitiesService(
    activities as never,
    sessions as never,
    appointments as never,
  );
  return { svc, activities, appointments };
}

describe('ActivitiesService.remove', () => {
  it('无预约记录时删除活动（场次由外键级联删除）', async () => {
    const { svc, activities, appointments } = buildService();

    await svc.remove(1);

    expect(appointments.countBy).toHaveBeenCalledWith({ activityId: 1 });
    expect(activities.remove).toHaveBeenCalledWith({
      id: 1,
      title: '测试活动',
    });
  });

  it('已有预约记录时拒绝删除并提示下架', async () => {
    const { svc, activities } = buildService({ bookings: 3 });

    await expect(svc.remove(1)).rejects.toThrow(BadRequestException);
    expect(activities.remove).not.toHaveBeenCalled();
  });

  it('活动不存在时抛出 404', async () => {
    const { svc } = buildService({ activity: null });

    await expect(svc.remove(999)).rejects.toThrow(NotFoundException);
  });
});
