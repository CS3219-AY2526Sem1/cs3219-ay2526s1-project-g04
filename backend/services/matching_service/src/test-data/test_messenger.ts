import { MatchingMessenger } from '../clients/messenger/messenger_client.js';
import { logger } from '../logger/logger.js';

export async function test_messenger() {
  try {
    const messenger = await MatchingMessenger.getInstance();
    logger.info(`[test_messenger] Matching messenger started.`);

    messenger.publishToCollaborationService('test-matching-id');
  } catch (error) {
    logger.error(
      `[test_messenger] Error while testing matching messenger: `,
      error,
    );
  }
}
