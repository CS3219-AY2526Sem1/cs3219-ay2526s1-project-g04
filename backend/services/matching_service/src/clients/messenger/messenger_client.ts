import { MESSAGE_TYPES } from '../../../../../shared/messaging/dist/src/constants.js';
import { MessagePublisher } from '../../../../../shared/messaging/dist/src/publisher.js';
import { logger } from '../../logger/logger.js';

export class MatchingMessenger {
  private static instance: MatchingMessenger;
  private publisher: MessagePublisher;

  private constructor() {
    this.publisher = new MessagePublisher('MatchingService');
  }

  public static async getInstance(): Promise<MatchingMessenger> {
    if (!MatchingMessenger.instance) {
      const messenger = new MatchingMessenger();
      await messenger.publisher.connect();
      MatchingMessenger.instance = messenger;
    }
    return MatchingMessenger.instance;
  }

  public publishToCollaborationService(matchingId: string): void {
    this.publisher.publishMessageWithType(
      MESSAGE_TYPES.CollaborationService,
      matchingId,
    );
    logger.info(
      `[MatchingMessenger] Published matching id ${matchingId} to collaboration service.`,
    );
  }
}
