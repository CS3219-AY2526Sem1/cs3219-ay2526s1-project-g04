import { MessageReceiver } from '@shared/messaging/src/consumer.js';
import { MESSAGE_TYPES } from '@shared/messaging/src/constants.js';
import { CommunicationManager } from './communication_manager';

export class MessageListener {
  private TYPES_TO_LISTEN = [MESSAGE_TYPES.CommunicationService];
  private communicationManager: CommunicationManager;

  constructor(communicationManager: CommunicationManager) {
    this.communicationManager = communicationManager;

    // To give 'this' context to message handler as it will be
    // lost when it is passed around as a function
    this.messageHandler = this.messageHandler.bind(this);
  }

  private handleStartSession(matchedId: string) {
    this.communicationManager.createDoc(matchedId);
  }

  private messageHandler(msgType: MESSAGE_TYPES, msg: string) {
    switch (msgType) {
      case MESSAGE_TYPES.CollaborationService: {
        const msgJson = JSON.parse(msg);
        if (msgJson['type'] === 'matched') {
          console.log(msgJson['matchedId']);
          this.handleStartSession(msgJson['matchedId']);
        }
        break;
      }
    }
  }
  public async start() {
    const broker = new MessageReceiver('communication_service');
    await broker.connect();

    broker.listenForMessagesWithType(this.TYPES_TO_LISTEN, this.messageHandler);
  }
}
