import { Redis } from '../../../../../../shared/redis/dist/redis.js';
import { EntryQueueData } from '../types.js';
import { logger } from '../../../logger/logger.js';

export class EntryQueue {
  private readonly ENTRY_QUEUE_KEY = 'entry_queue';

  constructor(private redis: Redis) {}

  /**
   * Function to queue job for matching worker.
   *
   * @param data Consists of job type ('match_user' | 'clear_user') and user_id
   */
  public async enqueue(data: EntryQueueData): Promise<void> {
    try {
      const serializeValue = JSON.stringify(data);
      await this.redis.enqueueValueByKey(this.ENTRY_QUEUE_KEY, serializeValue);
      logger.info(`[EntryQueue] Enqueued ${JSON.stringify(data)}.`);
    } catch (error) {
      logger.error(
        `[EntryQueue] Failed to enqueue data to ${this.ENTRY_QUEUE_KEY}:`,
        data,
        error,
      );
    }
  }

  /**
   * Function to dequeue a job for matching worker.
   *
   * @returns a job for the matching worker if the queue is not empty.
   */
  public async dequeue(): Promise<EntryQueueData | null> {
    try {
      const value = await this.redis.dequeueValueByKey(this.ENTRY_QUEUE_KEY);
      if (!value) return null;
      return JSON.parse(value) as EntryQueueData;
    } catch (error) {
      logger.error(
        `[EntryQueue] Failed to dequeue from ${this.ENTRY_QUEUE_KEY}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Function to completely clear the queue.
   */
  public async clearQueue(): Promise<void> {
    await this.redis.clearDataByKey(this.ENTRY_QUEUE_KEY);
    logger.info('Entry Queue cleared.');
  }
}
