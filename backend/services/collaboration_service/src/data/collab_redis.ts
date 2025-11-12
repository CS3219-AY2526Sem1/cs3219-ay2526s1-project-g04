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

  // Retrieves the matched user and question data associated with a match ID
  public async getMatchedData(
    matchedId: string,
  ): Promise<Record<string, string>> {
    const matchedData: Record<string, string> =
      await this.redis.getDictValueByKey(matchedId);
    return matchedData;
  }

  // Adds session details (sessionId and state) to a matched user’s Redis record
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

  // Updates the session state (e.g., created → active → end) for a given match ID
  public async setSessionState(
    sessionId: string,
    matchedId: string,
    state: SESSIONSTATE,
  ): Promise<void> {
    const matchedRedisData: Record<string, string> =
      await this.redis.getDictValueByKey(matchedId);
    if (sessionId !== matchedRedisData['session_id']) {
      console.log(
        '[Session] Session id does not match session id stored with matched id.',
      );
    }
    matchedRedisData['session_state'] = state.valueOf();
    await this.redis.setDictValueByKey(matchedId, matchedRedisData);
  }

  // Retrieves the session state, session ID, and communication state for a given match ID
  public async getSessionState(
    matchedId: string,
  ): Promise<Record<string, string | undefined>> {
    const matchedRedisData: Record<string, string> =
      await this.redis.getDictValueByKey(matchedId);
    return {
      session_state: matchedRedisData['session_state'],
      session_id: matchedRedisData['session_id'],
      communication_state: matchedRedisData['communication_state'],
    };
  }
}
