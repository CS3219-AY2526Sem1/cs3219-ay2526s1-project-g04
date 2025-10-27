import { Redis } from '@shared/redis';
import { MatchingPoolData } from '../types.js';
import { logger } from '../../../logger/logger.js';

export class FCFSList {
  private readonly FCFS_KEY = 'fcfs_list';

  constructor(private redis: Redis) {}

  /**
   * Adds a user to the end of the fcfs list.
   *
   * @param data contains userId and sessionKey to the fcfs list.
   */
  public async enqueueUser(data: MatchingPoolData): Promise<void> {
    try {
      const serializedValue = JSON.stringify(data);
      await this.redis.enqueueValueByKey(this.FCFS_KEY, serializedValue);

      logger.info(
        `[FCFSList] Enqueued user ${data.userId} with sessionKey=${data.sessionKey} to FCFS list.`,
      );
    } catch (error) {
      logger.error(
        `[FCFSList] Failed to enqueue to ${this.FCFS_KEY}`,
        data,
        error,
      );
    }
  }

  /**
   * Gets the position of the user in the fcfs list (with matching session key).
   *
   * @param data contains userId and sessionKey of the user to find in the fcfs list.
   * @returns position of the matching data, null if not found
   */
  public async getUserPosition(data: MatchingPoolData): Promise<number | null> {
    try {
      const serialisedData = JSON.stringify(data);

      const allData = await this.redis.peekAllValueByKey(this.FCFS_KEY);
      const index = allData.indexOf(serialisedData);

      return index === -1 ? null : index + 1;
    } catch (error) {
      logger.error(
        `[FCFSList] Failed to get position from ${this.FCFS_KEY}`,
        data,
        error,
      );
      return null;
    }
  }

  /**
   * Removes the matching data from the FCFS list.
   *
   * @param data contains the userId and sessionKey of the data to remove.
   */
  public async removeUser(data: MatchingPoolData): Promise<void> {
    try {
      const serialisedData = JSON.stringify(data);
      await this.redis.removeAllSpecifiedValueByKey(
        this.FCFS_KEY,
        serialisedData,
      );
      logger.info(
        `[FCFSList] Removed user ${data.userId} with sessionKey=${data.sessionKey} from FCFS list.`,
      );
    } catch (error) {
      logger.error(
        `[FCFSList] Failed to remove data from the FCFS List`,
        data,
        error,
      );
    }
  }

  public async clearList(): Promise<void> {
    await this.redis.clearDataByKey(this.FCFS_KEY);
    logger.info('FCFS List cleared.');
  }
}
