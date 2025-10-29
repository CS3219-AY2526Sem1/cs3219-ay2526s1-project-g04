import { Redis } from '../../../../../../shared/redis/dist/redis.js';
import { HashData, UserStatus } from '../types.js';
import { logger } from '../../../logger/logger.js';

const USER_TTL = 600; // 10 minutes

export class StatusHash {
  private readonly STATUS_KEY = 'status_hset';
  private readonly TTL_KEY = 'user_ttl';

  constructor(private redis: Redis) {}

  // TTL
  private getTTLKey(userId: string): string {
    return `${this.TTL_KEY}:${userId}`;
  }

  public async setUserTTL(userId: string, seconds: number): Promise<void> {
    try {
      const key = this.getTTLKey(userId);
      await this.redis.setStringValueByKey(key, 'active');
      await this.redis.setExpire(key, seconds);
      logger.info(
        `[StatusHash] User ${userId}'s TTL set to ${seconds} seconds.`,
      );
    } catch (error) {
      logger.error(`[StatusHash] Error setting user ${userId} TTL.`, error);
    }
  }

  /**
   * Gets the TTL of the user by userId.
   *
   * @param userId userId of user whose TTL to get.
   * @returns TTL of the user with userId.
   */
  public async getUserTTL(userId: string): Promise<number | null> {
    try {
      const key = this.getTTLKey(userId);
      return await this.redis.getTTL(key);
    } catch (error) {
      logger.error(
        `[StatusHash] Failed to get user TTL from ${this.TTL_KEY}`,
        userId,
        error,
      );
      return null;
    }
  }

  /**
   * Extends a user's (with userId) TTL by the given number of seconds. (overwrites current TTL)
   * @param userId userId of user TTL to extend.
   * @param seconds number of seconds to extend the TTL by (or overwrite current TTL).
   */
  public async extendUserTTL(userId: string, seconds: number): Promise<void> {
    try {
      const key = this.getTTLKey(userId);
      await this.redis.setExpire(key, seconds);
    } catch (error) {
      logger.error(
        `[StatusHash] Failed to extend user TTL from ${this.TTL_KEY}`,
        userId,
        error,
      );
    }
  }

  /**
   * Removes a user's TTL key and therefore also the TTL.
   * @param userId userId of user to remove TTL for.
   */
  public async removeUserTTL(userId: string): Promise<void> {
    try {
      const key = this.getTTLKey(userId);
      await this.redis.clearDataByKey(key);
    } catch (error) {
      logger.error(
        `[StatusHash] Failed to remove user ${userId} from ${this.TTL_KEY}.`,
        error,
      );
    }
  }

  public async clearAllTTLs() {
    try {
      // Get all TTL keys matching pattern
      const pattern = `${this.TTL_KEY}:*`;
      const keys = await this.redis.getKeysByPattern(pattern);

      if (keys.length === 0) {
        logger.info(`[StatusHash] No TTL keys found to clear.`);
        return;
      }

      // Clear all keys
      await Promise.all(keys.map((key) => this.redis.clearDataByKey(key)));

      logger.info(`[StatusHash] Cleared ${keys.length} TTL keys.`);
    } catch (error) {
      logger.error(`[StatusHash] Failed to clear all TTL keys.`, error);
    }
  }

  // hash functions
  /**
   * Adds a user to the status hash by ID.
   *
   * @param userId userId of the user to add to the status hash.
   * @param data metadata of the user to store in the status hash.
   */
  public async addUser(userId: string, data: HashData): Promise<void> {
    try {
      const exists = await this.getUserData(userId);
      if (exists) {
        console.warn(
          `User ${userId} already exists in status_hset. Skipping add.`,
        );
        return;
      }

      await this.redis.setDictValueByKey(this.STATUS_KEY, {
        [userId]: JSON.stringify(data),
      });

      // set user TTL
      await this.setUserTTL(userId, USER_TTL);
    } catch (error) {
      logger.error(
        `[StatusHash] Failed to add user to ${this.STATUS_KEY}`,
        userId,
        error,
      );
    }
  }

  /**
   * Updates a user's user status in the hash set.
   * @param userId userId of user to update status on.
   * @param status new status to update to.
   */
  public async updateUserStatus(
    userId: string,
    status: UserStatus,
  ): Promise<void> {
    try {
      const currentData = await this.getUserData(userId);
      if (!currentData) {
        logger.warn(
          `[StatusHash] User ${userId} not found in status_hset. Cannot update status.`,
        );
        return;
      }

      const updatedData: HashData = {
        ...currentData,
        status,
      };

      await this.redis.setDictValueByKey(this.STATUS_KEY, {
        [userId]: JSON.stringify(updatedData),
      });
      logger.info(
        `[StatusHash] Updated status for user ${userId} to ${status}`,
      );
    } catch (error) {
      logger.error(
        `[StatusHash] Failed to update status for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Function to update the lastSeen of user with userId.
   * @param userId userId of user to update last seen for.
   * @param lastSeen last seen value to update for.
   */
  public async updateLastSeen(userId: string, lastSeen: number): Promise<void> {
    try {
      const currentData = await this.getUserData(userId);
      if (!currentData) {
        logger.error(
          `[StatusHash] User ${userId} not found in status_hset. Failed to update last seen.`,
        );
        return;
      }

      const updatedData: HashData = {
        ...currentData,
        lastSeen,
      };

      await this.redis.setDictValueByKey(this.STATUS_KEY, {
        [userId]: JSON.stringify(updatedData),
      });
      logger.info(
        `[StatusHash] Updated last seen for user ${userId} to ${lastSeen}`,
      );
    } catch (error) {
      logger.error(
        `[StatusHash] Failed to update last seen for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Function to update the matchingId of the user with userId
   * @param userId userId of user to update matchingId for.
   * @param matchingId matchingId to set.
   */
  public async updateMatchingId(
    userId: string,
    matchingId: string,
  ): Promise<void> {
    try {
      const currentData = await this.getUserData(userId);
      if (!currentData) {
        logger.error(
          `[StatusHash] User ${userId} not found in status_hset. Failed to update matching id.`,
        );
        return;
      }

      const updatedData: HashData = {
        ...currentData,
        matchingId,
      };

      await this.redis.setDictValueByKey(this.STATUS_KEY, {
        [userId]: JSON.stringify(updatedData),
      });
      logger.info(
        `[StatusHash] Updated matching id for user ${userId} to ${matchingId}`,
      );
    } catch (error) {
      logger.error(
        `[StatusHash] Failed to update matching id for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Gets the data of the user with userId.
   * @param userId userId of the user to retrieve data for.
   * @returns Data of the user with userId.
   */
  public async getUserData(userId: string): Promise<HashData | null> {
    try {
      const allData = await this.redis.getDictValueByKey(this.STATUS_KEY);
      return allData[userId] ? (JSON.parse(allData[userId]) as HashData) : null;
    } catch (error) {
      logger.error(
        `[StatusHash] Failed to get user data of ${userId} from ${this.STATUS_KEY}`,
        error,
      );
      return null;
    }
  }

  /**
   * Gets all the data currently in the status hash.
   * @returns a dictionary of key: userId and value: HashData of user's data.
   */
  public async getAllUsers(): Promise<Record<string, HashData> | null> {
    try {
      const allData = await this.redis.getDictValueByKey(this.STATUS_KEY);
      const parsedData: Record<string, HashData> = {};

      for (const [userId, dataStr] of Object.entries(allData)) {
        parsedData[userId] = JSON.parse(dataStr) as HashData;
      }
      return parsedData;
    } catch (error) {
      logger.error(
        `[StatusHash] Failed to get data for all users from ${this.STATUS_KEY}.`,
        error,
      );
      return null;
    }
  }

  /**
   * Removes the key with userId from the status hash.
   * @param userId userId of user to remove from the status hash.
   */
  public async removeUser(userId: string): Promise<void> {
    try {
      await this.redis.deleteDictValueByKey(this.STATUS_KEY, userId);
      logger.info(
        `[StatusHash] Removed user ${userId} from ${this.STATUS_KEY}.`,
      );
    } catch (error) {
      logger.error(
        `[StatusHash] Failed to remove user ${userId} from ${this.STATUS_KEY}.`,
        error,
      );
    }
  }

  /**
   * Clears the whole status hash.
   */
  public async clearAllUsers(): Promise<void> {
    try {
      await this.redis.clearDataByKey(this.STATUS_KEY);
      logger.info(`[StatusHash] Cleared ${this.STATUS_KEY}.`);
    } catch (error) {
      logger.error(`[StatusHash] Failed to clear ${this.STATUS_KEY}.`, error);
    }
  }
}
