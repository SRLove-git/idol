import { ChatService } from './chat.service';

describe('ChatService.getMessages', () => {
  function buildService(andWhereCalls: string[]) {
    // 显式接口打破对象字面量自引用的循环类型推断（否则 fakeQb 被推断为 any）
    interface FakeQueryBuilder {
      leftJoin: jest.Mock;
      where: jest.Mock;
      andWhere: jest.Mock;
      orderBy: jest.Mock;
      take: jest.Mock;
      getMany: jest.Mock;
    }
    const fakeQb: FakeQueryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn((cond: string) => {
        andWhereCalls.push(cond);
        return fakeQb;
      }),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const conversations = {
      findOneBy: jest
        .fn()
        .mockResolvedValue({ id: 10, userAId: 32, userBId: 33 }),
    };
    const messages = { createQueryBuilder: jest.fn().mockReturnValue(fakeQb) };
    const blocks = {
      status: jest
        .fn()
        .mockResolvedValue({ blockedByMe: false, blockedByPeer: false }),
    };
    return new ChatService(
      conversations as never,
      messages as never,
      {} as never,
      {} as never,
      {} as never,
      blocks as never,
      {} as never,
      {} as never,
    );
  }

  it('删除过滤条件带括号，防止 OR 优先级绕过会话过滤', async () => {
    const andWhereCalls: string[] = [];
    const service = buildService(andWhereCalls);

    await service.getMessages(33, 10);

    // 不加括号会生成 (conversationId = ? AND ms.id IS NULL) OR deletedAt IS NULL，
    // 导致其他会话的消息也全部返回；必须为 OR 整体加括号。
    expect(andWhereCalls).toContain('(ms.id IS NULL OR ms.deletedAt IS NULL)');
    expect(
      andWhereCalls.some(
        (c) => c.includes('deletedAt IS NULL') && !c.includes('('),
      ),
    ).toBe(false);
  });

  it('对方拉黑我后发送消息被拒绝', async () => {
    const conversations = {
      findOneBy: jest.fn().mockResolvedValue({
        id: 10,
        userAId: 32,
        userBId: 33,
      }),
    };
    const users = {
      findOneBy: jest.fn().mockResolvedValue({ id: 33, isBanned: false }),
    };
    const blocks = {
      status: jest
        .fn()
        .mockResolvedValue({ blockedByMe: false, blockedByPeer: true }),
    };
    const follows = { isMutual: jest.fn().mockResolvedValue(true) };
    const messages = {
      count: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    const service = new ChatService(
      conversations as never,
      messages as never,
      {} as never,
      users as never,
      follows as never,
      blocks as never,
      {} as never,
      {} as never,
    );

    await expect(service.sendMessage(32, 10, 'text', 'hello')).rejects.toThrow(
      '对方已把你拉黑',
    );
    expect(blocks.status).toHaveBeenCalledWith(32, 33);
  });
});

describe('ChatService.onlineUserIds', () => {
  function buildService(mgetImpl: jest.Mock) {
    const redis = { mget: mgetImpl };
    return new ChatService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      redis as never,
      {} as never,
    );
  }

  it('一次 mget 批量取回在线计数，仅返回在线用户', async () => {
    const mget = jest.fn().mockResolvedValue(['1', '0', null, '3']);
    const service = buildService(mget);

    const online = await service.onlineUserIds([11, 22, 33, 44]);

    expect(mget).toHaveBeenCalledTimes(1);
    expect(mget).toHaveBeenCalledWith([
      'chat:online:11',
      'chat:online:22',
      'chat:online:33',
      'chat:online:44',
    ]);
    expect([...online].sort()).toEqual([11, 44]);
  });

  it('Redis 异常时降级为空集，不阻塞群聊推送', async () => {
    const mget = jest.fn().mockRejectedValue(new Error('redis down'));
    const service = buildService(mget);

    const online = await service.onlineUserIds([11, 22]);

    expect(online.size).toBe(0);
  });
});
