import { MatchingServiceRedis } from '../clients/redis/redis_client.js';
import {
  EntryQueueData,
  HashData,
  MatchingPoolData,
} from '../clients/redis/types.js';
import { MatchingWorker } from '../workers/matching_worker.js';
import { Users } from './test_data.js';
import { logger } from '../logger/logger.js';

export async function test_data_structures() {
  try {
    logger.info('==== test data structures started ====');

    const redis = await MatchingServiceRedis.getInstance();
    logger.info('[test_data_structures] Redis started.');

    logger.info('==== test entry queue ====');
    logger.info('---- enqueuing data into entry queue ----');
    for (const user of Users) {
      const enqueueData: EntryQueueData = {
        jobType: 'match_user',
        userId: user.userId,
        sessionKey: Date.now(),
      };
      await redis.entryQueue.enqueue(enqueueData);
    }

    logger.info(`---- dequeuing data from entry queue ----`);
    const data_count = Users.length;
    for (let i = 0; i < data_count + 1; i++) {
      const data_dequeued = await redis.entryQueue.dequeue();
      logger.info(
        `[test_data_structures] Dequeued data: ${JSON.stringify(data_dequeued)}`,
      );
    }
    logger.info('==== test data structures concluded ====');

    logger.info('==== test fcfs list ====');
    logger.info('[test_data_structures] Enqueuing users into FCFS list.');
    for (const user of Users) {
      const enqueueData: MatchingPoolData = {
        userId: user.userId,
        sessionKey: 1,
      };
      await redis.fcfsList.enqueueUser(enqueueData);
    }

    logger.info(
      '[test_data_structures] Getting positions of users in FCFS list.',
    );
    for (const user of Users) {
      const currUser: MatchingPoolData = {
        userId: user.userId,
        sessionKey: 1,
      };
      const position = await redis.fcfsList.getUserPosition(currUser);
      logger.info(
        `[test_data_structures] User ${user.userId} found at position ${position}.`,
      );
    }

    const fake_user: MatchingPoolData = {
      userId: 'fake_user',
      sessionKey: 1,
    };
    const fake_user_position = await redis.fcfsList.getUserPosition(fake_user);
    logger.info(
      `[test_data_structure] Position of unadded user: ${fake_user_position}.`,
    );

    const user_to_remove: MatchingPoolData = {
      userId: Users[0].userId,
      sessionKey: 1,
    };
    await redis.fcfsList.removeUser(user_to_remove);
    logger.info(`[test_data_structure] Removed user ${Users[0].userId}.`);

    logger.info('[test_data_structure] Getting positions in FCFS list again.');
    for (const user of Users) {
      const currUser: MatchingPoolData = {
        userId: user.userId,
        sessionKey: 1,
      };
      const position = await redis.fcfsList.getUserPosition(currUser);
      logger.info(
        `[test_data_structures] User ${user.userId} found at position ${position}.`,
      );
    }

    logger.info('==== test fcfs list concluded ====');

    logger.info('==== test matching pool ====');
    logger.info('[test_data_structures] Enqueuing users.');
    for (const user of Users) {
      const enqueueData: MatchingPoolData = {
        userId: user.userId,
        sessionKey: 1,
      };
      await redis.matchingPool.enqueueUser(
        enqueueData,
        user.difficulty,
        user.topics,
      );
      logger.info(
        `[test_data_structures] Enqueued user data ${JSON.stringify(enqueueData)} to difficulty ${user.difficulty} and topics ${user.topics}.`,
      );
    }

    logger.info('[test_data_structures] Testing peek queue.');
    for (const user of Users) {
      const topics: string[] = user.topics;
      for (const topic of topics) {
        const peekedData = await redis.matchingPool.peekQueue(
          user.difficulty,
          topic,
        );
        logger.info(
          `[test_data_structures] ${JSON.stringify(peekedData)} peeked from queue ${user.difficulty}:${topic}.`,
        );
      }
    }

    const removed_user_1: MatchingPoolData = {
      userId: Users[0].userId,
      sessionKey: 1,
    };
    await redis.matchingPool.removeUser(
      removed_user_1,
      Users[0].difficulty,
      Users[0].topics,
    );
    logger.info(
      `[test_data_structures] User ${Users[0].userId} removed from queues difficulty=${Users[0].difficulty} with topics=${Users[0].topics}.`,
    );

    logger.info('[test_data_structures] Testing peek queue.');
    for (const user of Users) {
      const topics: string[] = user.topics;
      for (const topic of topics) {
        const peekedData = await redis.matchingPool.peekQueue(
          user.difficulty,
          topic,
        );
        logger.info(
          `[test_data_structures] ${JSON.stringify(peekedData)} peeked from queue ${user.difficulty}:${topic}.`,
        );
      }
    }
    logger.info('==== test matching pool concluded ====');

    logger.info('==== test status hash ====');
    logger.info(`[test_data_structures] Adding users into the status hash.`);
    for (const user of Users) {
      const hashData: HashData = {
        sessionKey: Date.now(),
        status: 'waiting',
        difficulty: user.difficulty,
        topics: user.topics,
        lastSeen: Date.now(),
      };
      await redis.statusHash.addUser(user.userId, hashData);

      const userTTL = await redis.statusHash.getUserTTL(user.userId);
      logger.info(
        `[test_data_structures] Added user ${user.userId} with data ${JSON.stringify(hashData)} into status hash with TTL ${userTTL}.`,
      );
    }

    logger.info(`[test_data_structures] Updating user statuses to 'timeout'.`);
    for (const user of Users) {
      await redis.statusHash.updateUserStatus(user.userId, 'timeout');
      const updatedData = await redis.statusHash.getUserData(user.userId);
      logger.info(
        `[test_data_structures] Updated user data for user ${user.userId}: ${JSON.stringify(updatedData)}.`,
      );
    }

    const newLastSeen = Date.now();
    logger.info(
      `[test_data_structures] Updating user last seens to ${newLastSeen}.`,
    );
    for (const user of Users) {
      await redis.statusHash.updateLastSeen(user.userId, newLastSeen);
      const updatedData = await redis.statusHash.getUserData(user.userId);
      logger.info(
        `[test_data_structures] Updated user data for user ${user.userId}: ${JSON.stringify(updatedData)}.`,
      );
    }

    const matchingId = await redis.getNextMatchId();
    logger.info(
      `[test_data_structures] Matching ID obtained from Redis: ${matchingId}.`,
    );
    logger.info(
      `[test_data_structures] Updating users matching IDs to ${matchingId}.`,
    );
    for (const user of Users) {
      await redis.statusHash.updateMatchingId(user.userId, matchingId);
      const updatedData = await redis.statusHash.getUserData(user.userId);
      logger.info(
        `[test_data_strucutures] Updated user data for user ${user.userId}: ${JSON.stringify(updatedData)}.`,
      );
    }

    const allData = await redis.statusHash.getAllUsers();
    logger.info('[test_data_strucutures] Listing all data in status hash.');

    if (!allData) {
      logger.info('[test_data_structures] No data found in status hash.');
    } else {
      for (const [id, data] of Object.entries(allData)) {
        logger.info(`[test_data_structures] ${id}: ${JSON.stringify(data)}`);
      }
    }

    await redis.statusHash.removeUser(Users[0].userId);
    logger.info(`[test_data_structures] Removed user ${Users[0].userId}.`);

    const userData = await redis.statusHash.getUserData(Users[0].userId);
    logger.info(
      `[test_data_structures] Data retrieved for user ${Users[0].userId}: ${JSON.stringify(userData)}.`,
    );

    logger.info(`[test_data_structures] Waiting for 10 seconds.`);
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    await sleep(10000);

    logger.info('[test_data_structures] Retrieveing user TTLs.');
    for (const user of Users) {
      const userTTL = await redis.statusHash.getUserTTL(user.userId);

      logger.info(
        `[test_data_structures] User ${user.userId} has user TTL ${userTTL}.`,
      );
    }

    logger.info('[test_data_structures] Overwriting user TTLs to 10 seconds.');
    for (const user of Users) {
      await redis.statusHash.extendUserTTL(user.userId, 10);
      const updatedTTL = await redis.statusHash.getUserTTL(user.userId);
      logger.info(
        `[test_data_structures] User ${user.userId}'s TTL is now ${updatedTTL}.`,
      );
    }

    await redis.statusHash.removeUserTTL(Users[0].userId);
    logger.info(
      `[test_data_structures] Removed TTL for user ${Users[0].userId}.`,
    );

    const removedUserTTL = await redis.statusHash.getUserTTL(Users[0].userId);
    logger.info(
      `[test_data_structures] User TTL for user ${Users[0].userId}: ${removedUserTTL}.`,
    );
    logger.info('==== test status hash concluded ====');
  } catch (err) {
    console.error('Error: ', err);
    process.exit(1);
  }
}
