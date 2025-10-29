import { MatchingServiceRedis } from './clients/redis/redis_client.js';
import { MatchingWorker } from './workers/matching_worker.js';
import { TTLHandler } from './workers/ttl_handler.js';
import { TTLSubscriber } from './clients/redis/ttl_subscriber.js';
import { DisconnectSweeper } from './workers/disconnect_sweeper.js';
import { logger } from './logger/logger.js';
import { initServer } from './server.js';
// import { test_matching_worker } from './test/test_matching_worker.js';
// import { test_data_structures } from './test/test_data_structures.js';
// import { test_ttl_subscriber } from './test/test_ttl_subscriber.js';
// import { test_messenger } from './test/test_messenger.js';

/**
 * Entry point to matching service.
 * Instantiates and starts processes needed to run the matching service.
 */
async function main() {
  try {
    const matchingRedis = await MatchingServiceRedis.getInstance();
    const worker = await MatchingWorker.getInstance();

    const ttlHandler = new TTLHandler(matchingRedis);
    const subscriber = new TTLSubscriber(ttlHandler);

    const sweeper = new DisconnectSweeper(matchingRedis, false);

    worker.start();
    subscriber.subscribe();
    sweeper.start();

    await initServer();

    // await test_data_structures();
    // await test_matching_worker();
    // await test_ttl_subscriber();
    // await test_disconnect_sweeper();
    // await test_messenger();
  } catch (err) {
    logger.error('[main] Error: ', err);
    process.exit(1);
  }
}

main();
