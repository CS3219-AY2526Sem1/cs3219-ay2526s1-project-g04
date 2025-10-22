import { createClient, type RedisClientType } from 'redis';

export class Redis {
  private client: RedisClientType;

  constructor() {
    this.client = createClient({
      url: process.env['REDIS_URL'] || 'redis://localhost:6379',
    });
    this.client.on('error', (err) => console.log('Redis Client Error', err));
  }

  public async connect(): Promise<void> {
    await this.client.connect();
  }

  public async setStringValueByKey(
    key: string,
    value: string | number,
  ): Promise<void> {
    await this.client.set(key, value);
  }

  public async setDictValueByKey(
    key: string,
    value: Record<string, any>,
  ): Promise<void> {
    await this.client.hSet(key, value);
  }

  public async getStringValueByKey(key: string): Promise<string | null> {
    let value = await this.client.get(key);
    return value;
  }

  public async getDictValueByKey(key: string): Promise<Record<string, string>> {
    let value = await this.client.hGetAll(key);
    return value;
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
