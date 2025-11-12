import { jest } from '@jest/globals';
import { DisconnectSweeper } from '../../src/workers/disconnect_sweeper.js';
import { logger } from '../../src/logger/logger.js';
import type {
  HashData,
  UserStatus,
  EntryQueueData,
} from '../../src/clients/redis/types.js';

describe('DisconnectSweeper', () => {
  let mockMatchingRedis: any;
  let sweeper: DisconnectSweeper;

  const now = Date.now();
  const DISCONNECT_THRESHOLD = 30 * 1000;

  beforeAll(() => {
    logger.info = jest.fn(() => logger);
    logger.error = jest.fn(() => logger);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockMatchingRedis = {
      statusHash: {
        getAllUsers: jest
          .fn<() => Promise<Record<string, HashData> | null>>()
          .mockResolvedValue(null),

        updateUserStatus: jest
          .fn<(userId: string, status: UserStatus) => Promise<void>>()
          .mockResolvedValue(undefined),

        setUserTTL: jest
          .fn<(userId: string, seconds: number) => Promise<void>>()
          .mockResolvedValue(undefined),
      },

      entryQueue: {
        enqueue: jest
          .fn<(data: EntryQueueData) => Promise<void>>()
          .mockResolvedValue(undefined),
      },
    };

    sweeper = new DisconnectSweeper(mockMatchingRedis, false);
  });

  /**
   * start function
   */
  describe('start', () => {
    it('should set up an interval to call sweepDisconnectedUsers', () => {
      const sweepSpy = jest
        .spyOn(sweeper, 'sweepDisconnectedUsers')
        .mockResolvedValue(undefined);
      jest.useFakeTimers();

      sweeper.start();
      jest.advanceTimersByTime(10000);

      expect(sweepSpy).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  /**
   * sweepDisconnectedUsers function
   */
  describe('sweepDisconnectedUsers', () => {
    it('should skip if sweep already in progress', async () => {
      sweeper = new DisconnectSweeper(mockMatchingRedis, true);
      await sweeper.sweepDisconnectedUsers();

      expect(logger.info).toHaveBeenCalledWith(
        `[DisconnectSweeper] Previous sweeping incompleted, skipping call to sweeper.`,
      );

      expect(mockMatchingRedis.statusHash.getAllUsers).not.toHaveBeenCalled();
    });

    it('should handle case where getAllUsers returns null', async () => {
      mockMatchingRedis.statusHash.getAllUsers.mockResolvedValueOnce(null);
      await sweeper.sweepDisconnectedUsers();
      expect(mockMatchingRedis.statusHash.getAllUsers).toHaveBeenCalled();
    });

    it('should not enqueue if user is active within threshold', async () => {
      mockMatchingRedis.statusHash.getAllUsers.mockResolvedValueOnce({
        user1: {
          lastSeen: now - 5000, // 5 seconds ago
          status: 'waiting',
          sessionKey: 1234,
        },
      });

      await sweeper.sweepDisconnectedUsers();
      expect(mockMatchingRedis.entryQueue.enqueue).not.toHaveBeenCalled();
    });

    it('should detect disconnected user and enqueue clear job', async () => {
      mockMatchingRedis.statusHash.getAllUsers.mockResolvedValueOnce({
        user1: {
          lastSeen: now - (DISCONNECT_THRESHOLD + 1000), // 31s ago
          status: 'waiting',
          sessionKey: 1234,
          difficulty: 'Easy',
          topics: ['arrays'],
        },
      });

      await sweeper.sweepDisconnectedUsers();
      expect(logger.info).toHaveBeenCalledWith(
        `[DisconnectSweeper] User user1 detected to have disconnected.`,
      );
      expect(
        mockMatchingRedis.statusHash.updateUserStatus,
      ).toHaveBeenCalledWith('user1', 'disconnected');
      expect(mockMatchingRedis.entryQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          jobType: 'clear_user',
          userId: 'user1',
          sessionKey: 1234,
        }),
      );
      expect(mockMatchingRedis.statusHash.setUserTTL).toHaveBeenCalledWith(
        'user1',
        60,
      );
    });

    it('should skip users not in waiting status', async () => {
      mockMatchingRedis.statusHash.getAllUsers.mockResolvedValueOnce({
        user1: {
          lastSeen: now - (DISCONNECT_THRESHOLD + 1000),
          status: 'matched', // Not waiting
          sessionKey: 1234,
        },
      });

      await sweeper.sweepDisconnectedUsers();
      expect(mockMatchingRedis.entryQueue.enqueue).not.toHaveBeenCalled();
    });

    it('should handle redis or logic errors gracefully', async () => {
      mockMatchingRedis.statusHash.getAllUsers.mockRejectedValueOnce(
        new Error('Redis failure'),
      );
      await sweeper.sweepDisconnectedUsers();
      expect(logger.error).toHaveBeenCalledWith(
        '[DisconnectSweeper] Error during sweep:',
        expect.any(Error),
      );
    });

    it('should reset isSweeping flag after completion', async () => {
      mockMatchingRedis.statusHash.getAllUsers.mockResolvedValueOnce({});
      await sweeper.sweepDisconnectedUsers();
      expect((sweeper as any).isSweeping).toBe(false);
    });
  });
});
