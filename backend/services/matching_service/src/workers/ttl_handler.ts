import { MatchingServiceRedis } from '../clients/redis/redis_client.js';
import { logger } from '../logger/logger.js';
import type { EntryQueueData } from '../clients/redis/types.js';

const TTL_EXTENSION = 60;
const MATCHING_TTL_EXTENSION = 10;

export class TTLHandler {
  private redis: MatchingServiceRedis;

  constructor(redis: MatchingServiceRedis) {
    this.redis = redis;
  }

  /**
   * Function that handles a user when it is notified with a TTL expiry.
   *
   * @param userId userId of user to handle
   */
  public async handleUserExpiry(userId: string): Promise<void> {
    try {
      const userData = await this.redis.statusHash.getUserData(userId);
      if (!userData) {
        logger.warn(
          `[handleUserExpiry] User data for ${userId} not found in the status hash.`,
        );
        return;
      }

      if (userData.status === 'waiting') {
        const clearJob: EntryQueueData = {
          jobType: 'clear_user',
          userId: userId,
          sessionKey: userData.sessionKey,
          userData: userData,
        };

        await Promise.all([
          this.redis.entryQueue.enqueue(clearJob),
          this.redis.statusHash.updateUserStatus(userId, 'timeout'),
          this.redis.statusHash.setUserTTL(userId, TTL_EXTENSION),
        ]);
        logger.info(
          `[handleUserExpiry] Enqueued clear job: ${JSON.stringify(clearJob)}.`,
        );
        logger.info(
          `[handleUserExpiry] User status for ${userId} updated to 'timeout'.`,
        );
      } else if (userData.status === 'matching') {
        await this.redis.statusHash.setUserTTL(userId, MATCHING_TTL_EXTENSION);
        logger.info(
          `[handleUserExpiry] Extended User ${userId}'s TTL by ${MATCHING_TTL_EXTENSION} seconds.`,
        );
      } else {
        await this.redis.statusHash.removeUser(userId);
        logger.info(
          `[handleUserExpiry] Removed user ${userId} from status hash.`,
        );
      }
    } catch (error) {
      logger.error(`[handleUserExpiry] Error handling user expiry.`, error);
    }
  }
}
