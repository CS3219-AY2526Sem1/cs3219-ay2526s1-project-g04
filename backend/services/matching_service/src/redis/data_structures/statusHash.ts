import { Redis } from '@shared/redis';
import { UserData, UserStatus } from '../types.js';

export class StatusHash {
  private readonly STATUS_KEY = 'status_hset';

  constructor(private redis: Redis) {}

  public async addUser(userId: string, data: UserData): Promise<void> {
    const exists = await this.getUserData(userId);
    if (exists) {
      throw new Error(`User ${userId} already exists in status_hset. `);
    }

    await this.redis.setDictValueByKey(this.STATUS_KEY, {
      [userId]: JSON.stringify(data),
    });
  }

  public async updateUserStatus(
    userId: string,
    status: UserStatus,
  ): Promise<void> {
    const currentData = await this.getUserData(userId);
    if (!currentData) {
      throw new Error(`User ${userId} not found in status_hset. `);
    }

    const updatedData: UserData = {
      ...currentData,
      status,
    };

    await this.redis.setDictValueByKey(this.STATUS_KEY, {
      [userId]: JSON.stringify(updatedData),
    });
  }

  public async getUserData(userId: string): Promise<UserData | null> {
    const allData = await this.redis.getDictValueByKey(this.STATUS_KEY);
    return allData[userId] ? JSON.parse(allData[userId]) : null;
  }

  public async removeUser(userId: string): Promise<void> {
    await this.redis.deleteDictValueByKey(this.STATUS_KEY, userId);
  }

  public async clearAllUsers(): Promise<void> {
    await this.redis.clearDataByKey(this.STATUS_KEY);
    console.log('Cleared Status HSET.');
  }
}
