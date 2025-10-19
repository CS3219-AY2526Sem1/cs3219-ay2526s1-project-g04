import { MatchingServiceRedis } from './redis/redisClient.js';
import { UserData } from './redis/types.js';

async function main() {
  try {
    const redis = await MatchingServiceRedis.getInstance();

    // test
    const id = 'user1';
    const data: UserData = {
      status: 'waiting',
      difficulty: 'Easy',
      topics: ['Algorithms', 'DP'],
      lastSeen: Date.now(),
    };
    await redis.statusHash.addUser(id, data);
    const returnData = await redis.statusHash.getUserData('user1');
    console.log('Test HSET:', returnData);

    await redis.entryQueue.enqueue(id);
    const deqData = await redis.entryQueue.dequeue();
    console.log('Test Q:', deqData);

    console.log('TEST: MatchingPool ============');
    const difficulty = 'easy';
    const topic = 'arrays';

    console.log('➡️ Enqueueing users...');
    await redis.matchingPool.enqueueUser('user1', difficulty, topic);
    await redis.matchingPool.enqueueUser('user2', difficulty, topic);
    await redis.matchingPool.enqueueUser('user3', difficulty, topic);
    console.log('✅ Enqueued user1, user2, user3.');

    const peeked = await redis.matchingPool.peekQueue(difficulty, topic);
    console.log(`👀 Peeked user: ${peeked}`);

    console.log('⬇️ Dequeuing users...');
    const dequeued1 = await redis.matchingPool.dequeueUser(difficulty, topic);
    const dequeued2 = await redis.matchingPool.dequeueUser(difficulty, topic);
    const dequeued3 = await redis.matchingPool.dequeueUser(difficulty, topic);
    const dequeued4 = await redis.matchingPool.dequeueUser(difficulty, topic);
    console.log(
      `✅ Dequeued users: ${dequeued1}, ${dequeued2}, ${dequeued3}, ${dequeued4}`,
    );

    console.log('⬇️ Test dequeuing users from non-existent pool...');
    const deqNoExist = await redis.matchingPool.dequeueUser('Medium', 'DP');
    console.log(`✅ Dequeued users: ${deqNoExist}`);

    console.log('🧹 Clearing all queues...');
    await redis.matchingPool.clearAllQueues();

    console.log('✅ MatchingPool test completed.\n');

    console.log('==================================');
    console.log('FCFS list test:');
    console.log('==================================');

    await redis.fcfsList.enqueueUser('user1');
    await redis.fcfsList.enqueueUser('user2');
    await redis.fcfsList.enqueueUser('user3');

    console.log('--- Check positions ---');
    console.log(
      'Position of user1:',
      await redis.fcfsList.getUserPosition('user1'),
    ); // 0
    console.log(
      'Position of user2:',
      await redis.fcfsList.getUserPosition('user2'),
    ); // 1
    console.log(
      'Position of user3:',
      await redis.fcfsList.getUserPosition('user3'),
    ); // 1
    console.log(
      'Position of user4 (not in queue):',
      await redis.fcfsList.getUserPosition('user4'),
    ); // null

    console.log('--- Remove user2 ---');
    await redis.fcfsList.removeUser('user2');
    console.log(
      'Position of user1 after removal:',
      await redis.fcfsList.getUserPosition('user1'),
    ); // 0
    console.log(
      'Position of user2 after removal:',
      await redis.fcfsList.getUserPosition('user2'),
    ); // 0
    console.log(
      'Position of user3 after removal:',
      await redis.fcfsList.getUserPosition('user3'),
    ); // 0

    console.log('--- Clear list ---');
    await redis.fcfsList.clearList();
    console.log(
      'Position of user1 after clearing:',
      await redis.fcfsList.getUserPosition('user1'),
    ); // null
  } catch (err) {
    console.error('Error: ', err);
    process.exit(1);
  }
}

main();
