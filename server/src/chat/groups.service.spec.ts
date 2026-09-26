import { GroupsService } from './groups.service';

describe('GroupsService.myGroups', () => {
  /** 构造一个只涉及 myGroups 的服务（其余仓库以空 mock 占位） */
  function buildService(
    options: {
      readRows?: Array<{
        groupId: number;
        userId: number;
        lastReadMessageId: string;
      }>;
    } = {},
  ) {
    const countWhere: Array<Record<string, unknown>> = [];
    const groups = {
      find: jest.fn().mockResolvedValue([
        {
          id: 10,
          name: '测试群',
          ownerId: 1,
          lastMessagePreview: 'hi',
          lastMessageAt: new Date(),
        },
      ]),
    };
    const members = {
      findBy: jest.fn().mockResolvedValue([{ groupId: 10, userId: 1 }]),
      find: jest.fn().mockResolvedValue([
        { groupId: 10, userId: 1 },
        { groupId: 10, userId: 2 },
      ]),
    };
    const reads = {
      find: jest.fn().mockResolvedValue(options.readRows ?? []),
    };
    const users = {
      find: jest
        .fn()
        .mockResolvedValue([{ id: 2, nickname: 'u2', avatar: '' }]),
    };
    const messages = {
      countBy: jest.fn((where: Record<string, unknown>) => {
        countWhere.push(where);
        return Promise.resolve(0);
      }),
    };
    const service = new GroupsService(
      groups as never,
      members as never,
      messages as never,
      {} as never,
      reads as never,
      users as never,
      {} as never,
      {} as never,
    );
    // myGroups 内部只关心 formatGroup 返回的 unreadCount，这里直接透传
    (
      service as unknown as {
        formatGroup: (
          g: unknown,
          viewerId: number,
          memberCount: number,
          avatars: string[],
          unreadCount: number,
        ) => unknown;
      }
    ).formatGroup = (g, viewerId, memberCount, avatars, unreadCount) => ({
      ...(g as object),
      viewerId,
      memberCount,
      avatars,
      unreadCount,
    });
    return { service, countWhere };
  }

  it('未读数只统计他人消息，自己发的消息不计入', async () => {
    const { service, countWhere } = buildService();
    await service.myGroups(1);
    expect(countWhere[0]).toMatchObject({ groupId: 10 });
    expect(countWhere[0].senderId).toMatchObject({
      _type: 'not',
      _value: 1,
    });
  });

  it('已有已读游标时，仍排除自己发的消息', async () => {
    const { service, countWhere } = buildService({
      readRows: [{ groupId: 10, userId: 1, lastReadMessageId: '50' }],
    });
    await service.myGroups(1);
    expect(countWhere[0].senderId).toMatchObject({
      _type: 'not',
      _value: 1,
    });
    expect(countWhere[0].id).toMatchObject({ _type: 'moreThan', _value: 50 });
  });
});
