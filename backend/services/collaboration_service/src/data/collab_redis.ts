import { Redis } from '@shared/redis/src/redis.js';
import type { SESSIONSTATE } from '../session/session_manager.js';

export class CollabRedis {
  private static instance: CollabRedis;
  private redis!: Redis;

  private constructor() {}

  private async init() {
    this.redis = new Redis();
    await this.redis.connect();
  }

  public static async getInstance(): Promise<CollabRedis> {
    if (!CollabRedis.instance) {
      CollabRedis.instance = new CollabRedis();
      CollabRedis.instance.init();
    }
    return CollabRedis.instance;
  }

  public async getMatchedUser(
    matchedId: string,
  ): Promise<Record<string, string>> {
    const matchedData: Record<string, string> =
      await this.redis.getDictValueByKey(matchedId);
    return matchedData;
  }

  public async addSessionDataToUser(
    sessionId: string,
    matchedId: string,
    state: SESSIONSTATE,
  ): Promise<void> {
    const sessionData = {
      session_id: sessionId,
      session_state: state.valueOf(),
    };
    const matchedRedisData: Record<string, string> =
      await this.redis.getDictValueByKey(matchedId);
    this.redis.setDictValueByKey(matchedId, {
      ...matchedRedisData,
      ...sessionData,
    });
  }

  public async setSessionState(
    sessionId: string,
    matchedId: string,
    state: SESSIONSTATE,
  ): Promise<void> {
    const matchedRedisData: Record<string, string> =
      await this.redis.getDictValueByKey(matchedId);
    if (sessionId !== matchedRedisData['session_id']) {
      console.log('mismatch');
    }
    matchedRedisData['session_state'] = state.valueOf();
    await this.redis.setDictValueByKey(matchedId, matchedRedisData);
  }
}
