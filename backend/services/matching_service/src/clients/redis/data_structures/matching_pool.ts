import { Redis } from '@shared/redis/src/redis.js';
import { MatchingPoolData } from '../types.js';
import { logger } from '../../../logger/logger.js';

export class MatchingPool {
  private readonly MATCHING_POOL_KEY = 'matching_pool';

  constructor(private redis: Redis) {}

  private getKey(difficulty: string, topic: string): string {
    return `${this.MATCHING_POOL_KEY}:${difficulty}:${topic}`;
  }

  /**
   * Enqueues the user to all the relevant queues :${difficulty}:${topic}.
   *
   * @param data user to enqueue (userId + sessionKey).
   * @param difficulty user's chosen difficulty.
   * @param topics list of topics chosen by the user.
   */
  public async enqueueUser(
    data: MatchingPoolData,
    difficulty: string,
    topics: string[],
  ): Promise<void> {
    try {
      const serialisedData = JSON.stringify(data);
      const enqueuePromises = topics.map((topic) => {
        const key = this.getKey(difficulty, topic);
        return this.redis.enqueueValueByKey(key, serialisedData);
      });
      await Promise.all([enqueuePromises]);
      logger.info(
        `[MatchingPool] User ${data.userId} enqueued to all topics successfully.`,
      );
    } catch (error) {
      logger.error(
        `[MatchingPool] Failed to enqueue user to ${this.MATCHING_POOL_KEY}`,
        data,
        error,
      );
    }
  }

  /**
   * Removes user from relevant queues in the matching pool.
   *
   * @param data user data of user to remove (userId + sessionKey).
   * @param difficulty difficulty chosen by the user.
   * @param topics topics chosen by the user.
   */
  public async removeUser(
    data: MatchingPoolData,
    difficulty: string,
    topics: string[],
  ): Promise<void> {
    const serialisedData = JSON.stringify(data);
    try {
      await Promise.all(
        topics.map((topic) => {
          const key = this.getKey(difficulty, topic);
          return this.redis.removeAllSpecifiedValueByKey(key, serialisedData);
        }),
      );
      logger.info(
        `[MatchingPool] User ${data.userId} removed from all topics successfully.`,
      );
    } catch (error) {
      logger.error(
        `[MatchingPool] Failed to remove user from ${this.MATCHING_POOL_KEY}`,
        data,
        error,
      );
    }
  }

  /**
   * Peeks the queue and gets the first user in the queue (without removing).
   *
   * @param difficulty difficulty of queue to peek.
   * @param topic topic of queue to peek.
   * @returns user data of user at the front of the queue.
   */
  public async peekQueue(
    difficulty: string,
    topic: string,
  ): Promise<MatchingPoolData | null> {
    try {
      const key = this.getKey(difficulty, topic);

      const result = await this.redis.peekValueByKey(key);
      if (result) {
        return JSON.parse(result) as MatchingPoolData;
      } else {
        return null;
      }
    } catch (error) {
      logger.error(
        `[MatchingPool] Failed to peek from queue with difficulty=${difficulty} and topic=${topic}.`,
      );
      return null;
    }
  }

  public async clearAllQueues(): Promise<void> {
    const prefix = `${this.MATCHING_POOL_KEY}:*`;
    const keys = await this.redis.getKeysByPattern(prefix);

    if (keys.length === 0) {
      logger.info('[MatchingPool] No matching pool queues need to be cleared.');
      return;
    }

    await Promise.all(keys.map((k) => this.redis.clearDataByKey(k)));
    logger.info('[MatchingPool] Cleared Matching Pool.');
  }
}
