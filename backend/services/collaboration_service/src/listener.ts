import { MessageReceiver } from '@shared/messaging/src/consumer.js';
import { MESSAGE_TYPES } from '@shared/messaging/src/constants.js';
import type { SessionManager } from './session/session_manager.js';

export class MessageListener {
  private TYPES_TO_LISTEN = [MESSAGE_TYPES.CollaborationService];
  private sessionManager: SessionManager;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;

    // To give 'this' context to message handler as it will be
    // lost when it is passed around as a function
    this.messageHandler = this.messageHandler.bind(this);
  }

  private async handleStartSession(matchedId: string) {
    await this.sessionManager.createSession(matchedId);
  }

  private async messageHandler(msgType: MESSAGE_TYPES, msg: string) {
    switch (msgType) {
      case MESSAGE_TYPES.CollaborationService: {
        const msgJson = JSON.parse(msg);
        if (msgJson['type'] === 'matched') {
          // console.log(msgJson['matchedId']);
          await this.handleStartSession(msgJson['matchedId']);
        }
        break;
      }
    }
  }
  public async start() {
    const broker = new MessageReceiver('collab_service');
    await broker.connect();

    broker.listenForMessagesWithType(this.TYPES_TO_LISTEN, this.messageHandler);
  }
}
