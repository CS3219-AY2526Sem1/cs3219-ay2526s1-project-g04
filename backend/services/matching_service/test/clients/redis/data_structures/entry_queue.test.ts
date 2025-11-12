import { jest } from '@jest/globals';
import { EntryQueue } from '../../../../src/clients/redis/data_structures/entry_queue.js';
import type { EntryQueueData } from '../../../../src/clients/redis/types.js';
import { logger } from '../../../../src/logger/logger.js';

describe('EntryQueue', () => {
  let mockRedis: any;
  let queue: EntryQueue;

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

      dequeueValueByKey: jest
        .fn<(key: string) => Promise<string | null>>()
        .mockResolvedValue(null),

      clearDataByKey: jest
        .fn<(key: string | string[]) => Promise<void>>()
        .mockResolvedValue(undefined),
    };

    queue = new EntryQueue(mockRedis);
  });

  describe('enqueue', () => {
    it('should enqueue data and log info', async () => {
      const data: EntryQueueData = {
        jobType: 'match_user',
        userId: '123',
        sessionKey: 1234,
      };

      await queue.enqueue(data);

      expect(mockRedis.enqueueValueByKey).toHaveBeenCalledWith(
        'entry_queue',
        JSON.stringify(data),
      );
      expect(logger.info).toHaveBeenCalledWith(
        `[EntryQueue] Enqueued ${JSON.stringify(data)}.`,
      );
    });

    it('should log error if enqueue fails', async () => {
      const data: EntryQueueData = {
        jobType: 'match_user',
        userId: '123',
        sessionKey: 1234,
      };
      const error = new Error('Redis failed');
      mockRedis.enqueueValueByKey.mockRejectedValueOnce(error);

      await queue.enqueue(data);

      expect(logger.error).toHaveBeenCalledWith(
        `[EntryQueue] Failed to enqueue data to entry_queue:`,
        data,
        error,
      );
    });
  });

  describe('dequeue', () => {
    it('should return parsed data if queue is not empty', async () => {
      const data: EntryQueueData = {
        jobType: 'match_user',
        userId: '123',
        sessionKey: 1234,
      };
      mockRedis.dequeueValueByKey.mockResolvedValueOnce(JSON.stringify(data));

      const result = await queue.dequeue();

      expect(mockRedis.dequeueValueByKey).toHaveBeenCalledWith('entry_queue');
      expect(result).toEqual(data);
    });

    it('should return null if queue is empty', async () => {
      mockRedis.dequeueValueByKey.mockResolvedValueOnce(null);

      const result = await queue.dequeue();

      expect(result).toBeNull();
    });

    it('should log error and return null if dequeue fails', async () => {
      const error = new Error('Redis error');
      mockRedis.dequeueValueByKey.mockRejectedValueOnce(error);

      const result = await queue.dequeue();

      expect(logger.error).toHaveBeenCalledWith(
        `[EntryQueue] Failed to dequeue from entry_queue:`,
        error,
      );
      expect(result).toBeNull();
    });
  });

  describe('clearQueue', () => {
    it('should clear the queue and log info', async () => {
      await queue.clearQueue();

      expect(mockRedis.clearDataByKey).toHaveBeenCalledWith('entry_queue');
      expect(logger.info).toHaveBeenCalledWith(
        '[EntryQueue] Entry Queue cleared.',
      );
    });
  });
});
