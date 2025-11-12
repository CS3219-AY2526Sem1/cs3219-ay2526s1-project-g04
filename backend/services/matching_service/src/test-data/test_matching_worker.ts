import { MatchingServiceRedis } from '../clients/redis/redis_client.js';
import { MatchingWorker } from '../workers/matching_worker.js';
import { Users } from './test_data.js';
import { logger } from '../logger/logger.js';
import type { EntryQueueData, HashData } from '../clients/redis/types.js';

export async function test_matching_worker() {
  try {
    logger.info(
      '[test_matching_worker] ==== test matching worker started ====',
    );

    const redis = await MatchingServiceRedis.getInstance();
    const worker = await MatchingWorker.getInstance();

    worker.start();
    logger.info('[test_matching_worker] Matching worker started.');

    // add users one by one with delay
    logger.info(`[test_matching_worker] ==== Testing 'match_user' jobs. ====`);

    for (const user of Users) {
      const hash_data: HashData = {
        sessionKey: Date.now(),
        status: 'waiting',
        difficulty: user.difficulty,
        topics: user.topics,
        lastSeen: Date.now(),
      };
      await redis.statusHash.addUser(user.userId, hash_data);
      logger.info(
        `[test_matching_worker] User ${user.userId} added to status hash with data ${JSON.stringify(hash_data)}.`,
      );

      const job: EntryQueueData = {
        jobType: 'match_user',
        userId: user.userId,
        sessionKey: hash_data.sessionKey,
      };
      await redis.entryQueue.enqueue(job);
      logger.info(
        `[test_matching_worker] Enqueued match job to entry queue for user ${user.userId}: ${JSON.stringify(job)}.`,
      );

      await new Promise((res) => setTimeout(res, 2000));
    }

    logger.info(`[test_matching_worker] ==== Testing 'clear_user' jobs. ====`);
    for (const user of Users) {
      const userData = await redis.statusHash.getUserData(user.userId);

      if (!userData) {
        logger.warn(
          `[test_matching_worker] User data for user ${user.userId} cannot be found in the status hash.`,
        );
        continue;
      }

      const job: EntryQueueData = {
        jobType: 'clear_user',
        userId: user.userId,
        sessionKey: userData.sessionKey,
        userData: userData,
      };

      await redis.entryQueue.enqueue(job);
      logger.info(
        `[test_matching_worker] Clear job for user ${user.userId} added to entry queue: ${JSON.stringify(job)}.`,
      );
    }

    logger.info(
      `[test_matching_worker] Waiting 10 seconds to clear data structures for next tests.`,
    );
    await new Promise((res) => setTimeout(res, 10000));
    await redis.entryQueue.clearQueue();
    await redis.fcfsList.clearList();
    await redis.matchingPool.clearAllQueues();
    await redis.statusHash.clearAllUsers();
    await redis.statusHash.clearAllTTLs();

    // test outdated jobs
    logger.info(
      '[test_matching_worker] ==== Testing handling of outdated jobs (i.e. session key of job != session key of hash data). ====',
    );
    const outdated_user = Users[0];

    if (!outdated_user) {
      logger.warn(
        `[test_matching_worker] outdated_user not found in Users array.`,
      );
      return;
    }

    const sessionKey = Date.now();
    const outdatedHash: HashData = {
      sessionKey: sessionKey + 10,
      status: 'waiting',
      difficulty: outdated_user.difficulty,
      topics: outdated_user.topics,
      lastSeen: Date.now(),
    };
    const outdated_job_match: EntryQueueData = {
      jobType: 'match_user',
      userId: outdated_user.userId,
      sessionKey: sessionKey,
    };
    const outdated_job_clear: EntryQueueData = {
      jobType: 'clear_user',
      userId: outdated_user.userId,
      sessionKey: sessionKey,
      userData: outdatedHash,
    };

    await redis.statusHash.addUser(outdated_user.userId, outdatedHash);
    logger.info(
      `[test_matching_worker] User ${outdated_user.userId} added to status hash with session key ${sessionKey + 10}.`,
    );
    await redis.entryQueue.enqueue(outdated_job_match);
    logger.info(
      `[test_matching_worker] Enqueued match job ${JSON.stringify(outdated_job_match)}.`,
    );
    await redis.entryQueue.enqueue(outdated_job_clear);
    logger.info(
      `[test_matching_worker] Enqueued clear job ${JSON.stringify(outdated_job_clear)}.`,
    );

    // test disconnected users
    logger.info(
      `[test_matching_worker] ==== Testing handling of disconnected users (i.e. last seen > 30 seconds ago). ====`,
    );
    const disconnected_user = Users[1];

    if (!disconnected_user) {
      logger.warn(
        `[test_matching_worker] disconnected_user not found in Users array.`,
      );
      return;
    }

    const disconnected_hash: HashData = {
      sessionKey: Date.now(),
      status: 'waiting',
      difficulty: disconnected_user.difficulty,
      topics: disconnected_user.topics,
      lastSeen: Date.now() - 40000,
    };
    const disconnected_job_match: EntryQueueData = {
      jobType: 'match_user',
      userId: disconnected_user.userId,
      sessionKey: disconnected_hash.sessionKey,
    };
    const disconnected_job_clear: EntryQueueData = {
      jobType: 'clear_user',
      userId: disconnected_user.userId,
      sessionKey: disconnected_hash.sessionKey,
      userData: disconnected_hash,
    };
    await redis.statusHash.addUser(disconnected_user.userId, disconnected_hash);
    logger.info(
      `[test_matching_worker] User ${disconnected_user.userId} added to status hash with last seen ${disconnected_hash.lastSeen}.`,
    );
    await redis.entryQueue.enqueue(disconnected_job_match);
    logger.info(
      `[test_matching_worker] Enqueued match job: ${JSON.stringify(disconnected_job_match)}.`,
    );
    await redis.entryQueue.enqueue(disconnected_job_clear);
    logger.info(
      `[test_matching_worker] Enqueued clear job: ${JSON.stringify(disconnected_job_clear)}.`,
    );

    logger.info(
      `[test_matching_worker] ==== Testing handling of users with too little TTL (TTL left < 10) ====`,
    );
    const ttl_user = Users[2];

    if (!ttl_user) {
      logger.warn(`[test_matching_worker] ttl_user not found in Users array.`);
      return;
    }

    const ttl_hash_data: HashData = {
      sessionKey: Date.now(),
      status: 'waiting',
      difficulty: ttl_user.difficulty,
      topics: ttl_user.topics,
      lastSeen: Date.now(),
    };
    const ttl_match_job: EntryQueueData = {
      jobType: 'match_user',
      userId: ttl_user.userId,
      sessionKey: ttl_hash_data.sessionKey,
    };
    const ttl_clear_job: EntryQueueData = {
      jobType: 'clear_user',
      userId: ttl_user.userId,
      sessionKey: ttl_hash_data.sessionKey,
      userData: ttl_hash_data,
    };
    await redis.statusHash.addUser(ttl_user.userId, ttl_hash_data);
    await redis.statusHash.extendUserTTL(ttl_user.userId, 9);
    const user_ttl = await redis.statusHash.getUserTTL(ttl_user.userId);
    logger.info(
      `[test_matching_worker] User ${ttl_user.userId} added to status hash with TTL ${user_ttl}.`,
    );

    await redis.entryQueue.enqueue(ttl_match_job);
    logger.info(
      `[test_matching_worker] Enqueued match job: ${JSON.stringify(ttl_match_job)}.`,
    );

    await redis.entryQueue.enqueue(ttl_clear_job);
    logger.info(
      `[test_matching_worker] Enqueued clear job: ${JSON.stringify(ttl_clear_job)}.`,
    );
  } catch (err) {
    logger.error('[test_matching_worker] Error: ', err);
    process.exit(1);
  }
}
