import { MessageReceiver } from '@shared/messaging/src/consumer.js';
import { MESSAGE_TYPES } from '@shared/messaging/src/constants.js';
import { CommunicationManager } from './communication_manager.js';

export class MessageListener {
  private TYPES_TO_LISTEN = [MESSAGE_TYPES.CommunicationService];
  private communicationManager: CommunicationManager;

  constructor(communicationManager: CommunicationManager) {
    this.communicationManager = communicationManager;

    // To give 'this' context to message handler as it will be
    // lost when it is passed around as a function
    this.messageHandler = this.messageHandler.bind(this);
  }

  private async handleStartSession(matchedId: string, sessionId: string) {
    this.communicationManager.createDoc(matchedId, sessionId);
  }

  private async messageHandler(msgType: MESSAGE_TYPES, msg: string) {
    switch (msgType) {
      case MESSAGE_TYPES.CommunicationService: {
        const msgJson = JSON.parse(msg);
        // Assume that collab service already creates the code document
        if (msgJson['type'] === 'create') {
          console.log(
            `matchedId: ${msgJson['matchedId']}; sessionId: ${msgJson[`sessionId`]}`,
          );
          await this.handleStartSession(
            msgJson['matchedId'],
            msgJson['sessionId'],
          );
        }
        break;
      }
    }
  }
  public async start() {
    const broker = new MessageReceiver(MESSAGE_TYPES.CommunicationService);
    await broker.connect();

    broker.listenForMessagesWithType(this.TYPES_TO_LISTEN, this.messageHandler);
  }
}
