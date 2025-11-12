import { jest } from '@jest/globals';
import { FCFSList } from '../../../../src/clients/redis/data_structures/fcfs_list.js';
import type { MatchingPoolData } from '../../../../src/clients/redis/types.js';
import { logger } from '../../../../src/logger/logger.js';

describe('FCFSList', () => {
  let mockRedis: any;
  let list: FCFSList;

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

      peekAllValueByKey: jest
        .fn<(key: string) => Promise<string[]>>()
        .mockResolvedValue([]),

      removeAllSpecifiedValueByKey: jest
        .fn<(key: string, value: string) => Promise<number>>()
        .mockResolvedValue(17),

      clearDataByKey: jest
        .fn<(key: string | string[]) => Promise<void>>()
        .mockResolvedValue(undefined),
    };

    list = new FCFSList(mockRedis);
  });

  describe('enqueueUser', () => {
    it('should enqueue a user and log info', async () => {
      const data: MatchingPoolData = {
        userId: '123',
        sessionKey: 1234,
      };

      await list.enqueueUser(data);

      expect(mockRedis.enqueueValueByKey).toHaveBeenCalledWith(
        'fcfs_list',
        JSON.stringify(data),
      );
      expect(logger.info).toHaveBeenCalledWith(
        `[FCFSList] Enqueued user ${data.userId} with sessionKey=${data.sessionKey} to FCFS list.`,
      );
    });

    it('should log error if enqueue fails', async () => {
      const data: MatchingPoolData = {
        userId: '123',
        sessionKey: 1234,
      };
      const error = new Error('Redis failed');
      mockRedis.enqueueValueByKey.mockRejectedValueOnce(error);

      await list.enqueueUser(data);

      expect(logger.error).toHaveBeenCalledWith(
        `[FCFSList] Failed to enqueue to fcfs_list`,
        data,
        error,
      );
    });

    describe('getUserPosition', () => {
      it('should return 1-based index if user exists', async () => {
        const data: MatchingPoolData = {
          userId: '123',
          sessionKey: 1234,
        };
        const serialized = JSON.stringify(data);
        mockRedis.peekAllValueByKey.mockResolvedValueOnce([serialized]);

        const pos = await list.getUserPosition(data);
        expect(pos).toBe(1);
        expect(mockRedis.peekAllValueByKey).toHaveBeenCalledWith('fcfs_list');
      });

      it('should return null if user does not exist', async () => {
        const data: MatchingPoolData = {
          userId: '123',
          sessionKey: 1234,
        };
        mockRedis.peekAllValueByKey.mockResolvedValueOnce([]);

        const pos = await list.getUserPosition(data);
        expect(pos).toBeNull();
      });

      it('should log error and return null if peek fails', async () => {
        const data: MatchingPoolData = {
          userId: '123',
          sessionKey: 1234,
        };
        const error = new Error('Redis error');
        mockRedis.peekAllValueByKey.mockRejectedValueOnce(error);

        const pos = await list.getUserPosition(data);
        expect(logger.error).toHaveBeenCalledWith(
          `[FCFSList] Failed to get position from fcfs_list`,
          data,
          error,
        );
        expect(pos).toBeNull();
      });
    });

    describe('removeUser', () => {
      it('should remove a user and log info', async () => {
        const data: MatchingPoolData = {
          userId: '123',
          sessionKey: 1234,
        };
        await list.removeUser(data);
        expect(mockRedis.removeAllSpecifiedValueByKey).toHaveBeenCalledWith(
          'fcfs_list',
          JSON.stringify(data),
        );
        expect(logger.info).toHaveBeenCalledWith(
          `[FCFSList] Removed user ${data.userId} with sessionKey=${data.sessionKey} from FCFS list.`,
        );
      });

      it('should log error if remove fails', async () => {
        const data: MatchingPoolData = { userId: '123', sessionKey: 42 };
        const error = new Error('Redis error');
        mockRedis.removeAllSpecifiedValueByKey.mockRejectedValueOnce(error);

        await list.removeUser(data);

        expect(logger.error).toHaveBeenCalledWith(
          `[FCFSList] Failed to remove data from the FCFS List`,
          data,
          error,
        );
      });
    });

    describe('clearList', () => {
      it('should clear the list and log info', async () => {
        await list.clearList();

        expect(mockRedis.clearDataByKey).toHaveBeenCalledWith('fcfs_list');
        expect(logger.info).toHaveBeenCalledWith(
          '[FCFSList] FCFS List cleared.',
        );
      });
    });
  });
});
