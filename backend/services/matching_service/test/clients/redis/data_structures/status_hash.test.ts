import { jest } from '@jest/globals';
import { StatusHash } from '../../../../src/clients/redis/data_structures/status_hash.js';
import type {
  HashData,
  UserStatus,
} from '../../../../src/clients/redis/types.js';
import { logger } from '../../../../src/logger/logger.js';

describe('StatusHash', () => {
  let mockRedis: any;
  let hash: StatusHash;

  beforeAll(() => {
    logger.info = jest.fn(() => logger);
    logger.error = jest.fn(() => logger);
    logger.warn = jest.fn(() => logger);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockRedis = {
      setStringValueByKey: jest
        .fn<(key: string, value: string) => Promise<void>>()
        .mockResolvedValue(undefined),

      setExpire: jest
        .fn<(key: string, seconds: number) => Promise<void>>()
        .mockResolvedValue(undefined),

      getTTL: jest
        .fn<(key: string) => Promise<number>>()
        .mockResolvedValue(600),

      getKeysByPattern: jest
        .fn<(pattern: string) => Promise<string[]>>()
        .mockResolvedValue([]),

      setDictValueByKey: jest
        .fn<(key: string, value: Record<string, any>) => Promise<void>>()
        .mockResolvedValue(undefined),

      getDictValueByKey: jest
        .fn<(key: string) => Promise<Record<string, string>>>()
        .mockResolvedValue({}),

      deleteDictValueByKey: jest
        .fn<(key: string, value: string) => Promise<number>>()
        .mockResolvedValue(17),

      clearDataByKey: jest
        .fn<(key: string | string[]) => Promise<void>>()
        .mockResolvedValue(undefined),
    };

    hash = new StatusHash(mockRedis);
  });

  describe('TTL methods', () => {
    it('should set user TTL', async () => {
      await hash.setUserTTL('user1', 300);
      expect(mockRedis.setStringValueByKey).toHaveBeenCalledWith(
        'user_ttl:user1',
        'active',
      );
      expect(mockRedis.setExpire).toHaveBeenCalledWith('user_ttl:user1', 300);
      expect(logger.info).toHaveBeenCalledWith(
        "[StatusHash] User user1's TTL set to 300 seconds.",
      );
    });

    it('should get user TTL', async () => {
      const ttl = await hash.getUserTTL('user1');
      expect(ttl).toBe(600);
      expect(mockRedis.getTTL).toHaveBeenCalledWith('user_ttl:user1');
    });

    it('should extend user TTL', async () => {
      await hash.extendUserTTL('user1', 500);
      expect(mockRedis.setExpire).toHaveBeenCalledWith('user_ttl:user1', 500);
    });

    it('should remove user TTL', async () => {
      await hash.removeUserTTL('user1');
      expect(mockRedis.clearDataByKey).toHaveBeenCalledWith('user_ttl:user1');
    });

    it('should clear all TTLs', async () => {
      mockRedis.getKeysByPattern.mockResolvedValueOnce([
        'user_ttl:user1',
        'user_ttl:user2',
      ]);
      await hash.clearAllTTLs();
      expect(mockRedis.clearDataByKey).toHaveBeenCalledWith('user_ttl:user1');
      expect(mockRedis.clearDataByKey).toHaveBeenCalledWith('user_ttl:user2');
      expect(logger.info).toHaveBeenCalledWith(
        '[StatusHash] Cleared 2 TTL keys.',
      );
    });

    it('should log info if no TTLs exist to clear', async () => {
      mockRedis.getKeysByPattern.mockResolvedValueOnce([]);
      await hash.clearAllTTLs();
      expect(logger.info).toHaveBeenCalledWith(
        '[StatusHash] No TTL keys found to clear.',
      );
    });
  });

  describe('Hash methods', () => {
    const userData: HashData = {
      sessionKey: 1234,
      status: 'waiting',
      difficulty: 'Easy',
      topics: ['topic1', 'topic2'],
      lastSeen: 0,
    };

    it('should add user if not exists', async () => {
      mockRedis.getDictValueByKey.mockResolvedValueOnce({});
      await hash.addUser('user1', userData);

      expect(mockRedis.setDictValueByKey).toHaveBeenCalledWith('status_hset', {
        user1: JSON.stringify(userData),
      });
      expect(mockRedis.setStringValueByKey).toHaveBeenCalled(); // TTL set
    });

    it('should skip add if user exists', async () => {
      mockRedis.getDictValueByKey.mockResolvedValueOnce({
        user1: JSON.stringify(userData),
      });
      await hash.addUser('user1', userData);
      expect(logger.info).toHaveBeenCalledWith(
        'User user1 already exists in status_hset. Skipping add.',
      );
    });

    it('should update user status', async () => {
      mockRedis.getDictValueByKey.mockResolvedValueOnce({
        user1: JSON.stringify(userData),
      });
      await hash.updateUserStatus('user1', 'matched');

      expect(mockRedis.setDictValueByKey).toHaveBeenCalledWith('status_hset', {
        user1: JSON.stringify({ ...userData, status: 'matched' }),
      });
      expect(logger.info).toHaveBeenCalledWith(
        '[StatusHash] Updated status for user user1 to matched',
      );
    });

    it('should warn if updating status of non-existent user', async () => {
      mockRedis.getDictValueByKey.mockResolvedValueOnce({});
      await hash.updateUserStatus('user1', 'matched');
      expect(logger.warn).toHaveBeenCalledWith(
        '[StatusHash] User user1 not found in status_hset. Cannot update status.',
      );
    });

    it('should update lastSeen', async () => {
      mockRedis.getDictValueByKey.mockResolvedValueOnce({
        user1: JSON.stringify(userData),
      });
      await hash.updateLastSeen('user1', 12345);
      expect(mockRedis.setDictValueByKey).toHaveBeenCalledWith('status_hset', {
        user1: JSON.stringify({ ...userData, lastSeen: 12345 }),
      });
      expect(logger.info).toHaveBeenCalledWith(
        '[StatusHash] Updated last seen for user user1 to 12345',
      );
    });

    it('should update matchingId', async () => {
      mockRedis.getDictValueByKey.mockResolvedValueOnce({
        user1: JSON.stringify(userData),
      });
      await hash.updateMatchingId('user1', 'match123');
      expect(mockRedis.setDictValueByKey).toHaveBeenCalledWith('status_hset', {
        user1: JSON.stringify({ ...userData, matchingId: 'match123' }),
      });
      expect(logger.info).toHaveBeenCalledWith(
        '[StatusHash] Updated matching id for user user1 to match123',
      );
    });

    it('should get user data', async () => {
      mockRedis.getDictValueByKey.mockResolvedValueOnce({
        user1: JSON.stringify(userData),
      });
      const result = await hash.getUserData('user1');
      expect(result).toEqual(userData);
    });

    it('should get all users', async () => {
      mockRedis.getDictValueByKey.mockResolvedValueOnce({
        user1: JSON.stringify(userData),
        user2: JSON.stringify({ ...userData, status: 'inactive' }),
      });
      const result = await hash.getAllUsers();
      expect(result).toEqual({
        user1: userData,
        user2: { ...userData, status: 'inactive' },
      });
    });

    it('should remove user', async () => {
      await hash.removeUser('user1');
      expect(mockRedis.deleteDictValueByKey).toHaveBeenCalledWith(
        'status_hset',
        'user1',
      );
      expect(logger.info).toHaveBeenCalledWith(
        '[StatusHash] Removed user user1 from status_hset.',
      );
    });

    it('should clear all users', async () => {
      await hash.clearAllUsers();
      expect(mockRedis.clearDataByKey).toHaveBeenCalledWith('status_hset');
      expect(logger.info).toHaveBeenCalledWith(
        '[StatusHash] Cleared status_hset.',
      );
    });
  });
});
