import { jest } from '@jest/globals';
import { MatchingPool } from '../../../../src/clients/redis/data_structures/matching_pool.js';
import type { MatchingPoolData } from '../../../../src/clients/redis/types.js';
import { logger } from '../../../../src/logger/logger.js';

describe('MatchingPool', () => {
  let mockRedis: any;
  let pool: MatchingPool;

  beforeAll(() => {
    logger.info = jest.fn(() => logger);
    logger.error = jest.fn(() => logger);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockRedis = {
      enqueueValueByKey: jest
        .fn<(key: string, value: string) => Promise<number>>()
        .mockResolvedValue(17),

      removeAllSpecifiedValueByKey: jest
        .fn<(key: string, value: string) => Promise<number>>()
        .mockResolvedValue(17),

      peekValueByKey: jest
        .fn<(key: string) => Promise<string | null>>()
        .mockResolvedValue(null),

      getKeysByPattern: jest
        .fn<(pattern: string) => Promise<string[]>>()
        .mockResolvedValue([]),

      clearDataByKey: jest
        .fn<(key: string | string[]) => Promise<void>>()
        .mockResolvedValue(undefined),
    };

    pool = new MatchingPool(mockRedis);
  });

  describe('enqueueUser', () => {
    it('should enqueue user to all topics', async () => {
      const data: MatchingPoolData = { userId: '123', sessionKey: 17 };
      const topics = ['topic1', 'topic2'];
      const difficulty = 'Easy';

      await pool.enqueueUser(data, difficulty, topics);

      for (const topic of topics) {
        expect(mockRedis.enqueueValueByKey).toHaveBeenCalledWith(
          `matching_pool:${difficulty}:${topic}`,
          JSON.stringify(data),
        );
      }

      expect(logger.info).toHaveBeenCalledWith(
        `[MatchingPool] User ${data.userId} enqueued to all topics successfully.`,
      );
    });

    it('should log error if enqueue fails', async () => {
      const data: MatchingPoolData = { userId: '123', sessionKey: 17 };
      const topics = ['topic1'];
      const difficulty = 'Easy';
      const error = new Error('Redis error');

      mockRedis.enqueueValueByKey.mockRejectedValueOnce(error);

      await pool.enqueueUser(data, difficulty, topics);

      expect(logger.error).toHaveBeenCalledWith(
        `[MatchingPool] Failed to enqueue user to matching_pool`,
        data,
        error,
      );
    });
  });

  describe('removeUser', () => {
    it('should remove user from all topics', async () => {
      const data: MatchingPoolData = { userId: '123', sessionKey: 17 };
      const topics = ['topic1', 'topic2'];
      const difficulty = 'Easy';

      await pool.removeUser(data, difficulty, topics);

      for (const topic of topics) {
        expect(mockRedis.removeAllSpecifiedValueByKey).toHaveBeenCalledWith(
          `matching_pool:${difficulty}:${topic}`,
          JSON.stringify(data),
        );
      }

      expect(logger.info).toHaveBeenCalledWith(
        `[MatchingPool] User ${data.userId} removed from all topics successfully.`,
      );
    });

    it('should log error if remove fails', async () => {
      const data: MatchingPoolData = { userId: '123', sessionKey: 17 };
      const topics = ['topic1'];
      const difficulty = 'Easy';
      const error = new Error('Redis error');

      mockRedis.removeAllSpecifiedValueByKey.mockRejectedValueOnce(error);

      await pool.removeUser(data, difficulty, topics);

      expect(logger.error).toHaveBeenCalledWith(
        `[MatchingPool] Failed to remove user from matching_pool`,
        data,
        error,
      );
    });
  });

  describe('peekQueue', () => {
    it('should return parsed user if present', async () => {
      const data: MatchingPoolData = { userId: '123', sessionKey: 42 };
      const difficulty = 'easy';
      const topic = 'topic1';

      mockRedis.peekValueByKey.mockResolvedValueOnce(JSON.stringify(data));

      const result = await pool.peekQueue(difficulty, topic);

      expect(result).toEqual(data);
      expect(mockRedis.peekValueByKey).toHaveBeenCalledWith(
        `matching_pool:${difficulty}:${topic}`,
      );
    });

    it('should return null if queue is empty', async () => {
      const difficulty = 'easy';
      const topic = 'topic1';

      const result = await pool.peekQueue(difficulty, topic);

      expect(result).toBeNull();
    });

    it('should log error and return null on failure', async () => {
      const difficulty = 'easy';
      const topic = 'topic1';
      const error = new Error('Redis error');
      mockRedis.peekValueByKey.mockRejectedValueOnce(error);

      const result = await pool.peekQueue(difficulty, topic);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        `[MatchingPool] Failed to peek from queue with difficulty=${difficulty} and topic=${topic}. err: ${error}`,
      );
    });
  });

  describe('clearAllQueues', () => {
    it('should clear all queues if keys exist', async () => {
      mockRedis.getKeysByPattern.mockResolvedValueOnce([
        'matching_pool:easy:topic1',
        'matching_pool:easy:topic2',
      ]);

      await pool.clearAllQueues();

      expect(mockRedis.clearDataByKey).toHaveBeenCalledTimes(2);
      expect(mockRedis.clearDataByKey).toHaveBeenCalledWith(
        'matching_pool:easy:topic1',
      );
      expect(mockRedis.clearDataByKey).toHaveBeenCalledWith(
        'matching_pool:easy:topic2',
      );

      expect(logger.info).toHaveBeenCalledWith(
        '[MatchingPool] Cleared Matching Pool.',
      );
    });

    it('should log info if no queues exist', async () => {
      mockRedis.getKeysByPattern.mockResolvedValueOnce([]);

      await pool.clearAllQueues();

      expect(logger.info).toHaveBeenCalledWith(
        '[MatchingPool] No matching pool queues need to be cleared.',
      );
      expect(mockRedis.clearDataByKey).not.toHaveBeenCalled();
    });
  });
});
