import { Redis } from '@shared/redis';

export class EntryQueue {
  private readonly ENTRY_QUEUE_KEY = 'entry_queue';

  constructor(private redis: Redis) {}

  public async enqueue(userId: string): Promise<void> {
    await this.redis.enqueueValueByKey(this.ENTRY_QUEUE_KEY, userId);
  }

  public async dequeue(): Promise<string | null> {
    const user_id = await this.redis.dequeueValueByKey(this.ENTRY_QUEUE_KEY);
    return user_id;
  }

  public async clearQueue(): Promise<void> {
    await this.redis.clearDataByKey(this.ENTRY_QUEUE_KEY);
    console.log('Entry Queue cleared.');
  }
}
