import { Redis } from '@shared/redis';

export class FCFSList {
  private readonly FCFS_KEY = 'fcfs_list';

  constructor(private redis: Redis) {}

  public async enqueueUser(userId: string): Promise<void> {
    await this.redis.enqueueValueByKey(this.FCFS_KEY, userId);
  }

  public async getUserPosition(userId: string): Promise<number | null> {
    const users = await this.redis.peekAllValueByKey(this.FCFS_KEY);
    const index = users.indexOf(userId);
    return index === -1 ? null : index;
  }

  public async removeUser(userId: string): Promise<void> {
    await this.redis.removeAllSpecifiedValueByKey(this.FCFS_KEY, userId);
  }

  public async clearList(): Promise<void> {
    await this.redis.clearDataByKey(this.FCFS_KEY);
    console.log('FCFS List cleared.');
  }
}
