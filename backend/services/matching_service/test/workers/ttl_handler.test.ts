import { jest } from '@jest/globals';
import { TTLHandler } from '../../src/workers/ttl_handler.js';
import { logger } from '../../src/logger/logger.js';
import type {
  EntryQueueData,
  HashData,
  UserStatus,
} from '../../src/clients/redis/types.js';

describe('TTLHandler', () => {
  let mockMatchingRedis: any;
  let ttlHandler: TTLHandler;

  beforeAll(() => {
    logger.info = jest.fn(() => logger);
    logger.warn = jest.fn(() => logger);
    logger.error = jest.fn(() => logger);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockMatchingRedis = {
      statusHash: {
        getUserData: jest
          .fn<(userId: string) => Promise<HashData | null>>()
          .mockResolvedValue(null),

        updateUserStatus: jest
          .fn<(userId: string, status: UserStatus) => Promise<void>>()
          .mockResolvedValue(undefined),

        setUserTTL: jest
          .fn<(userId: string, seconds: number) => Promise<void>>()
          .mockResolvedValue(undefined),

        removeUser: jest
          .fn<(userId: string) => Promise<void>>()
          .mockResolvedValue(undefined),
      },

      entryQueue: {
        enqueue: jest
          .fn<(data: EntryQueueData) => Promise<void>>()
          .mockResolvedValue(undefined),
      },
    };

    ttlHandler = new TTLHandler(mockMatchingRedis);
  });

  it('should warn and return if user data not found', async () => {
    mockMatchingRedis.statusHash.getUserData.mockResolvedValueOnce(null);

    await ttlHandler.handleUserExpiry('user1');

    expect(logger.warn).toHaveBeenCalledWith(
      '[handleUserExpiry] User data for user1 not found in the status hash.',
    );
    expect(mockMatchingRedis.entryQueue.enqueue).not.toHaveBeenCalled();
  });

  it('should enqueue clear job and update status if user is waiting', async () => {
    const userData: HashData = {
      status: 'waiting',
      sessionKey: 1234,
      difficulty: 'Easy',
      topics: ['topic1'],
      lastSeen: 1000,
    };
    mockMatchingRedis.statusHash.getUserData.mockResolvedValueOnce(userData);

    await ttlHandler.handleUserExpiry('user1');

    const expectedJob: EntryQueueData = {
      jobType: 'clear_user',
      userId: 'user1',
      sessionKey: 1234,
      userData,
    };

    expect(mockMatchingRedis.entryQueue.enqueue).toHaveBeenCalledWith(
      expectedJob,
    );
    expect(mockMatchingRedis.statusHash.updateUserStatus).toHaveBeenCalledWith(
      'user1',
      'timeout',
    );
    expect(mockMatchingRedis.statusHash.setUserTTL).toHaveBeenCalledWith(
      'user1',
      60,
    );
    expect(logger.info).toHaveBeenCalledWith(
      `[handleUserExpiry] Enqueued clear job: ${JSON.stringify(expectedJob)}.`,
    );
    expect(logger.info).toHaveBeenCalledWith(
      `[handleUserExpiry] User status for user1 updated to 'timeout'.`,
    );
  });

  it('should extend TTL if user is matching', async () => {
    const userData = {
      status: 'matching',
      sessionKey: 5678,
      difficulty: 'Medium',
      topics: ['topicA'],
    };
    mockMatchingRedis.statusHash.getUserData.mockResolvedValueOnce(userData);

    await ttlHandler.handleUserExpiry('user2');

    expect(mockMatchingRedis.statusHash.setUserTTL).toHaveBeenCalledWith(
      'user2',
      10,
    );
    expect(logger.info).toHaveBeenCalledWith(
      `[handleUserExpiry] Extended User user2's TTL by 10 seconds.`,
    );
  });

  it('should remove user if status is not waiting or matching', async () => {
    const userData = {
      status: 'matched',
      sessionKey: 4321,
    };
    mockMatchingRedis.statusHash.getUserData.mockResolvedValueOnce(userData);

    await ttlHandler.handleUserExpiry('user3');

    expect(mockMatchingRedis.statusHash.removeUser).toHaveBeenCalledWith(
      'user3',
    );

    expect(logger.info).toHaveBeenCalledWith(
      `[handleUserExpiry] Removed user user3 from status hash.`,
    );
  });

  it('should log error if exception is thrown', async () => {
    mockMatchingRedis.statusHash.getUserData.mockRejectedValueOnce(
      new Error('Redis failure'),
    );

    await ttlHandler.handleUserExpiry('user4');

    expect(logger.error).toHaveBeenCalledWith(
      `[handleUserExpiry] Error handling user expiry.`,
      expect.any(Error),
    );
  });
});
