import { Redis } from '@shared/redis';

export class MatchingPool {
  private readonly MATCHING_POOL_KEY = 'matching_pool';

  constructor(private redis: Redis) {}

  private getKey(difficulty: string, topic: string): string {
    return `${this.MATCHING_POOL_KEY}:${difficulty}:${topic}`;
  }

  public async enqueueUser(
    userId: string,
    difficulty: string,
    topic: string,
  ): Promise<void> {
    const key = this.getKey(difficulty, topic);
    await this.redis.enqueueValueByKey(key, userId);
  }

  public async dequeueUser(
    difficulty: string,
    topic: string,
  ): Promise<string | null> {
    const key = this.getKey(difficulty, topic);
    return await this.redis.dequeueValueByKey(key);
  }

  public async peekQueue(
    difficulty: string,
    topic: string,
  ): Promise<string | null> {
    const key = this.getKey(difficulty, topic);
    return await this.redis.peekValueByKey(key);
  }

  public async clearAllQueues(): Promise<void> {
    const prefix = `${this.MATCHING_POOL_KEY}:*`;
    const keys = await this.redis.getKeysByPattern(prefix);

    if (keys.length === 0) {
      console.log('No matching pool queues need to be cleared.');
      return;
    }

    await Promise.all(keys.map((k) => this.redis.clearDataByKey(k)));
    console.log('Cleared Matching Pool.');
  }
}
