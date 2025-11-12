import { Redis } from '@shared/redis/src/redis.js';
import { COMMUNICATION_STATE } from '../types/enums';
import { SESSIONSTATE } from 'services/collaboration_service/src/session/session_manager';

export class CommunicationRedis {
  private static instance: CommunicationRedis;
  private redis!: Redis;

  private constructor() {}

  private async init() {
    this.redis = new Redis();
    await this.redis.connect();
  }

  public static async getInstance(): Promise<CommunicationRedis> {
    if (!CommunicationRedis.instance) {
      CommunicationRedis.instance = new CommunicationRedis();
      CommunicationRedis.instance.init();
    }
    return CommunicationRedis.instance;
  }

  public async isUserInSession(
    matchedId: string,
    userId: string,
  ): Promise<boolean> {
    const matchedRedisData: Record<string, string> =
      await this.redis.getDictValueByKey(matchedId);
    return (
      matchedRedisData['userAId'] == userId ||
      matchedRedisData['userBId'] == userId
    );
  }

  public async setCommunicationState(
    matchedId: string,
    state: COMMUNICATION_STATE,
  ): Promise<void> {
    const matchedRedisData: Record<string, string> =
      await this.redis.getDictValueByKey(matchedId);
    matchedRedisData['communication_state'] = state.valueOf();
    await this.redis.setDictValueByKey(matchedId, matchedRedisData);
  }

  // public async isSessionDead(matchedId: string): Promise<boolean> {
  //   const matchedRedisData: Record<string, string> =
  //     await this.redis.getDictValueByKey(matchedId);
  //   console.log(matchedRedisData['session_state']);
  //   return matchedRedisData['session_state'] == SESSIONSTATE.end;
  // }

  public async addCommunicationState(matchedId: string): Promise<void> {
    const commsData = {
      communication_state: SESSIONSTATE.notCreated,
    };
    const matchedRedisData: Record<string, string> =
      await this.redis.getDictValueByKey(matchedId);
    this.redis.setDictValueByKey(matchedId, {
      ...matchedRedisData,
      ...commsData,
    });
  }
}
