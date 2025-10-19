import { Redis } from '@shared/redis';
import { EntryQueue } from './data_structures/entryQueue.js';
import { FCFSList } from './data_structures/fcfsList.js';
import { MatchingPool } from './data_structures/matchingPool.js';
import { StatusHash } from './data_structures/statusHash.js';

export class MatchingServiceRedis {
  private static instance: MatchingServiceRedis;
  private redis!: Redis;

  public entryQueue!: EntryQueue;
  public fcfsList!: FCFSList;
  public matchingPool!: MatchingPool;
  public statusHash!: StatusHash;

  private constructor() {}

  private async init() {
    this.redis = new Redis();
    await this.redis.connect();

    this.entryQueue = new EntryQueue(this.redis);
    this.fcfsList = new FCFSList(this.redis);
    this.matchingPool = new MatchingPool(this.redis);
    this.statusHash = new StatusHash(this.redis);

    await this.initDataStructures();

    console.log('Matching Service Redis connected. ');
  }

  public static async getInstance(): Promise<MatchingServiceRedis> {
    if (!MatchingServiceRedis.instance) {
      MatchingServiceRedis.instance = new MatchingServiceRedis();
      await MatchingServiceRedis.instance.init();
    }
    return MatchingServiceRedis.instance;
  }

  public async initDataStructures(): Promise<void> {
    console.log('Initializing Redis data structures.');
    await this.entryQueue.clearQueue();
    await this.fcfsList.clearList();
    await this.statusHash.clearAllUsers();
    await this.matchingPool.clearAllQueues();
    console.log('✅ Redis data structures initialized (old data cleared).');
  }
}
