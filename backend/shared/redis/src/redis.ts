import { createClient, type RedisClientType } from 'redis';

export class Redis {
  private client: RedisClientType;

  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => console.log('Redis Client Error', err));
  }

  // Connection / Client
  public async connect(): Promise<void> {
    await this.client.connect();
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
  }

  public async subscribe(channel: string, callback: (message: string) => void) {
    const subscriber = this.client.duplicate();
    await subscriber.connect();
    await subscriber.subscribe(channel, callback);
  }

  // String Operations
  public async setStringValueByKey(
    key: string,
    value: string | number,
  ): Promise<void> {
    await this.client.set(key, value);
  }

  public async getStringValueByKey(key: string): Promise<string | null> {
    let value = await this.client.get(key);
    return value;
  }

  // Hash Operations
  public async setDictValueByKey(
    key: string,
    value: Record<string, any>,
  ): Promise<void> {
    await this.client.hSet(key, value);
  }

  public async getDictValueByKey(key: string): Promise<Record<string, string>> {
    let value = await this.client.hGetAll(key);
    return value;
  }

  public async deleteDictValueByKey(
    key: string,
    value: string,
  ): Promise<number> {
    const deletedCount = await this.client.hDel(key, value);
    return deletedCount;
  }

  public async getKeysByPattern(pattern: string): Promise<string[]> {
    const keys = await this.client.keys(pattern);
    return keys;
  }

  // List Operations
  public async enqueueValueByKey(key: string, value: string): Promise<number> {
    const listLength = await this.client.rPush(key, value);
    return listLength;
  }

  public async dequeueValueByKey(key: string): Promise<string | null> {
    const value = await this.client.lPop(key);
    return value;
  }

  public async peekValueByKey(key: string): Promise<string | null> {
    const value = await this.client.lIndex(key, 0);
    return value;
  }

  public async peekAllValueByKey(key: string): Promise<string[]> {
    const arr = await this.client.lRange(key, 0, -1);
    return arr;
  }

  public async removeAllSpecifiedValueByKey(
    key: string,
    value: string,
  ): Promise<number> {
    const count = await this.client.lRem(key, 0, value);
    return count;
  }

  // clear
  public async clearDataByKey(key: string | string[]): Promise<void> {
    await this.client.del(key);
  }

  // TTL
  public async setExpire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  public async getTTL(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  public async persistTTL(key: string): Promise<void> {
    await this.client.persist(key);
  }

  // numbers
  public async incrementKey(key: string): Promise<number> {
    return await this.client.incr(key);
  }
}
