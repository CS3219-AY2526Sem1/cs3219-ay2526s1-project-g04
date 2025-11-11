import { jest } from '@jest/globals';

const mockConnect = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockIncrementKey = jest
  .fn<(key: string) => Promise<number>>()
  .mockResolvedValue(42);
const mockSetDictValueByKey = jest
  .fn<(key: string, value: Record<string, any>) => Promise<void>>()
  .mockResolvedValue(undefined);

const mockClearQueue = jest
  .fn<() => Promise<void>>()
  .mockResolvedValue(undefined);
const mockClearList = jest
  .fn<() => Promise<void>>()
  .mockResolvedValue(undefined);
const mockClearAllUsers = jest
  .fn<() => Promise<void>>()
  .mockResolvedValue(undefined);
const mockClearAllTTLs = jest
  .fn<() => Promise<void>>()
  .mockResolvedValue(undefined);
const mockClearAllQueues = jest
  .fn<() => Promise<void>>()
  .mockResolvedValue(undefined);

await jest.unstable_mockModule('@shared/redis/src/redis.js', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    incrementKey: mockIncrementKey,
    setDictValueByKey: mockSetDictValueByKey,
  })),
}));

await jest.unstable_mockModule(
  '../../../src/clients/redis/data_structures/entry_queue.js',
  () => ({
    EntryQueue: jest.fn().mockImplementation(() => ({
      clearQueue: mockClearQueue,
    })),
  }),
);

await jest.unstable_mockModule(
  '../../../src/clients/redis/data_structures/fcfs_list.js',
  () => ({
    FCFSList: jest.fn().mockImplementation(() => ({
      clearList: mockClearList,
    })),
  }),
);

await jest.unstable_mockModule(
  '../../../src/clients/redis/data_structures/status_hash.js',
  () => ({
    StatusHash: jest.fn().mockImplementation(() => ({
      clearAllUsers: mockClearAllUsers,
      clearAllTTLs: mockClearAllTTLs,
    })),
  }),
);

await jest.unstable_mockModule(
  '../../../src/clients/redis/data_structures/matching_pool.js',
  () => ({
    MatchingPool: jest.fn().mockImplementation(() => ({
      clearAllQueues: mockClearAllQueues,
    })),
  }),
);

const { MatchingServiceRedis } = await import(
  '../../../src/clients/redis/redis_client.js'
);

describe('MatchingServiceRedis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (MatchingServiceRedis as any).instance = undefined;
  });

  it('initializes correctly and clears all data structures', async () => {
    const service = await MatchingServiceRedis.getInstance();

    expect(mockConnect).toHaveBeenCalled();
    expect(mockClearQueue).toHaveBeenCalled();
    expect(mockClearList).toHaveBeenCalled();
    expect(mockClearAllUsers).toHaveBeenCalled();
    expect(mockClearAllTTLs).toHaveBeenCalled();
    expect(mockClearAllQueues).toHaveBeenCalled();
  });

  it('returns the next match ID as a string', async () => {
    const service = await MatchingServiceRedis.getInstance();
    const nextId = await service.getNextMatchId();

    expect(mockIncrementKey).toHaveBeenCalledWith('next_match_id');
    expect(nextId).toBe('42');
  });

  it('sets a matching hash in Redis', async () => {
    const service = await MatchingServiceRedis.getInstance();
    await service.setMatchingHash('m123', 'userA', 'userB', 'q789');

    expect(mockSetDictValueByKey).toHaveBeenCalledWith('matched:m123', {
      userAId: 'userA',
      userBId: 'userB',
      questionId: 'q789',
    });
  });

  it('singleton returns the same instance', async () => {
    const instance1 = await MatchingServiceRedis.getInstance();
    const instance2 = await MatchingServiceRedis.getInstance();
    expect(instance1).toBe(instance2);
  });
});
