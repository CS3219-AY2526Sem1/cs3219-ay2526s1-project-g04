import { MatchingServiceRedis } from '../clients/redis/redis_client.js';
import { logger } from '../logger/logger.js';
import { DisconnectSweeper } from '../workers/disconnect_sweeper.js';
import { Users } from './test_data.js';
import type { HashData } from '../clients/redis/types.js';

export async function test_disconnect_sweeper() {
  try {
    logger.info(
      `[test_disconnect_sweeper] ==== Start test disconnect sweeper ====`,
    );

    const matchingRedis = await MatchingServiceRedis.getInstance();
    const sweeper = new DisconnectSweeper(matchingRedis, false);

    logger.info(
      `[test_disconnect_sweeper] Start populating data structures with users.`,
    );

    const user1 = Users[0];

    if (!user1) {
      logger.warn(`[test_disconnect_sweeper] user1 not found in User array.`);
      return;
    }

    const status1: HashData = {
      sessionKey: Date.now(),
      status: 'waiting',
      difficulty: user1.difficulty,
      topics: user1.topics,
      lastSeen: Date.now() - 31000,
    };
    await matchingRedis.statusHash.addUser(user1.userId, status1);

    const user2 = Users[1];

    if (!user2) {
      logger.warn(`[test_disconnect_sweeper] user2 not found in User array.`);
      return;
    }

    const status2: HashData = {
      sessionKey: Date.now(),
      status: 'waiting',
      difficulty: user1.difficulty,
      topics: user1.topics,
      lastSeen: Date.now(),
    };
    await matchingRedis.statusHash.addUser(user2.userId, status2);

    const user3 = Users[2];

    if (!user3) {
      logger.warn(`[test_disconnect_sweeper] user3 not found in User array.`);
      return;
    }

    const status3: HashData = {
      sessionKey: Date.now(),
      status: 'waiting',
      difficulty: user1.difficulty,
      topics: user1.topics,
      lastSeen: Date.now() + 30000,
    };
    await matchingRedis.statusHash.addUser(user3.userId, status3);

    const user4 = Users[3];

    if (!user4) {
      logger.warn(`[test_disconnect_sweeper] user4 not found in User array.`);
      return;
    }

    const status4: HashData = {
      sessionKey: Date.now(),
      status: 'matched',
      difficulty: user1.difficulty,
      topics: user1.topics,
      lastSeen: Date.now() - 31000,
    };
    await matchingRedis.statusHash.addUser(user4.userId, status4);

    sweeper.start();
  } catch (error) {
    logger.error(
      `[test_disconnect_sweeper] Error while testing disconnect sweeper: `,
      error,
    );
  }
}
