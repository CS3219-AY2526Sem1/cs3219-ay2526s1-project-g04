import { MatchingServiceRedis } from '../clients/redis/redis_client.js';
import { TTLSubscriber } from '../clients/redis/ttl_subscriber.js';
import { logger } from '../logger/logger.js';
import { TTLHandler } from '../workers/ttl_handler.js';
import { Users } from './test_data.js';
import type { HashData } from '../clients/redis/types.js';

export async function test_ttl_subscriber() {
  try {
    logger.info(`[test_ttl_subscriber] ==== test ttl subscriber ====`);

    const matchingRedis = await MatchingServiceRedis.getInstance();
    const ttlHandler = new TTLHandler(matchingRedis);

    const subscriber = new TTLSubscriber(ttlHandler);
    await subscriber.subscribe();

    logger.info(`[test_ttl_subscriber] Populating test data.`);
    // waiting
    const waiting_user = Users[0];

    if (!waiting_user) {
      logger.warn(
        `[test_ttl_subscriber] No waiting user found in Users array.`,
      );
      return;
    }

    const waiting_status: HashData = {
      sessionKey: Date.now(),
      status: 'waiting',
      difficulty: waiting_user.difficulty,
      topics: waiting_user.topics,
      lastSeen: Date.now(),
    };
    await matchingRedis.statusHash.addUser(waiting_user.userId, waiting_status);
    await matchingRedis.statusHash.extendUserTTL(waiting_user.userId, 5);
    logger.info(
      `[test_ttl_subscriber] Added user ${waiting_user.userId} to status hash with status 'waiting' and TTL 5 seconds.`,
    );

    // matching
    const matching_user = Users[1];

    if (!matching_user) {
      logger.warn(
        `[test_ttl_subscriber] No matching user found in Users array.`,
      );
      return;
    }

    const matching_status: HashData = {
      sessionKey: Date.now(),
      status: 'matching',
      difficulty: matching_user.difficulty,
      topics: matching_user.topics,
      lastSeen: Date.now(),
    };
    await matchingRedis.statusHash.addUser(
      matching_user.userId,
      matching_status,
    );
    await matchingRedis.statusHash.extendUserTTL(matching_user.userId, 5);
    logger.info(
      `[test_ttl_subscriber] Added user ${matching_user.userId} to status hash with status 'matching' and TTL 5 seconds.`,
    );

    // matched, timeout, disconnected, cancelled
    const matched_user = Users[2];

    if (!matched_user) {
      logger.warn(
        `[test_ttl_subscriber] No matched user found in Users array.`,
      );
      return;
    }

    const matched_status: HashData = {
      sessionKey: Date.now(),
      status: 'matched',
      difficulty: matched_user.difficulty,
      topics: matched_user.topics,
      lastSeen: Date.now(),
      matchingId: '111111',
    };
    await matchingRedis.statusHash.addUser(matched_user.userId, matched_status);
    await matchingRedis.statusHash.extendUserTTL(matched_user.userId, 5);
    logger.info(
      `[test_ttl_subscriber] Added user ${matched_user.userId} to status hash with status 'matched' and TTL 5 seconds.`,
    );
  } catch (error) {
    logger.error(
      `[test_ttl_subscriber] error while testing ttl subscriber.`,
      error,
    );
  }
}
