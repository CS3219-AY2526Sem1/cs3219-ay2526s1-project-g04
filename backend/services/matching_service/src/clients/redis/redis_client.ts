import { Redis } from '@shared/redis/src/redis.js';
import { EntryQueue } from './data_structures/entry_queue.js';
import { FCFSList } from './data_structures/fcfs_list.js';
import { MatchingPool } from './data_structures/matching_pool.js';
import { StatusHash } from './data_structures/status_hash.js';
import { logger } from '../../logger/logger.js';
import type { MatchedValue } from '@shared/redis/src/models/match_model.js';

export class MatchingServiceRedis {
  private static instance: MatchingServiceRedis;
  private redis!: Redis;

  public entryQueue!: EntryQueue;
  public fcfsList!: FCFSList;
  public matchingPool!: MatchingPool;
  public statusHash!: StatusHash;

  private readonly MATCH_ID_KEY = 'next_match_id';

  private constructor() {}

  private async init() {
    this.redis = new Redis();
    await this.redis.connect();

    this.entryQueue = new EntryQueue(this.redis);
    this.fcfsList = new FCFSList(this.redis);
    this.matchingPool = new MatchingPool(this.redis);
    this.statusHash = new StatusHash(this.redis);

    await this.initDataStructures();

    logger.info('[MatchingServiceRedis] Matching Service Redis connected. ');
  }

  public static async getInstance(): Promise<MatchingServiceRedis> {
    if (!MatchingServiceRedis.instance) {
      MatchingServiceRedis.instance = new MatchingServiceRedis();
      await MatchingServiceRedis.instance.init();
    }
    return MatchingServiceRedis.instance;
  }

  public async initDataStructures(): Promise<void> {
    logger.info('[MatchingServiceRedis] Initializing Redis data structures.');
    await this.entryQueue.clearQueue();
    await this.fcfsList.clearList();
    await this.statusHash.clearAllUsers();
    await this.statusHash.clearAllTTLs();
    await this.matchingPool.clearAllQueues();
    logger.info(
      '[MatchingServiceRedis] ✅ Redis data structures initialized (old data cleared).',
    );
  }

  public async getNextMatchId(): Promise<string> {
    const nextId = await this.redis.incrementKey(this.MATCH_ID_KEY);
    return nextId.toString();
  }

  public async setMatchingHash(
    matchingId: string,
    userAId: string,
    userBId: string,
    questionId: string,
  ): Promise<void> {
    try {
      const key = `matched:${matchingId}`;
      const value: MatchedValue = {
        userAId: userAId,
        userBId: userBId,
        questionId: questionId,
      };

      await this.redis.setDictValueByKey(key, value);
      logger.info(
        `[setMatchingHash] Added matched hash into shared Redis with key=${key} and value=${JSON.stringify(value)}.`,
      );
    } catch (error) {
      logger.error(
        `[setMatchingHash] Error adding matched hash into shared Redis.`,
        matchingId,
        error,
      );
    }
  }
}
