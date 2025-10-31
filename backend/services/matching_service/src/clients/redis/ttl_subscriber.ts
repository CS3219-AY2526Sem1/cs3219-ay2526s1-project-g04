import { Redis } from '@shared/redis/src/redis.js';
import { TTLHandler } from '../../workers/ttl_handler.js';
import { logger } from '../../logger/logger.js';

export class TTLSubscriber {
  private redis: Redis;
  private ttlHandler: TTLHandler;

  constructor(ttlHandler: TTLHandler) {
    this.redis = new Redis();
    this.ttlHandler = ttlHandler;
  }

  public async subscribe(): Promise<void> {
    await this.redis.connect();
    logger.info(`[TTLSubscriber] Redis connected, subscribing to TTL events.`);

    await this.redis.subscribe('__keyevent@0__:expired', async (expiredKey) => {
      try {
        if (!expiredKey.startsWith('user_ttl:')) return;

        const parts = expiredKey.split(':');
        const userId = parts[1];
        if (!userId) {
          logger.warn(
            `[TTLSubscriber] No userId found in expired key: ${expiredKey}.`,
          );
          return;
        }

        logger.info(`[TTLSubscriber] TTL expired for user ${userId}.`);
        await this.ttlHandler.handleUserExpiry(userId);
      } catch (err) {
        logger.error(
          `[TTLSubscriber] Error handling expired key:`,
          expiredKey,
          err,
        );
      }
    });
  }
}
