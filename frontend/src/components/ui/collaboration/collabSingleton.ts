'use client';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

let yCodeDoc: Y.Doc | null = null;
let codeProvider: WebsocketProvider | null = null;
let yCommsDoc: Y.Doc | null = null;
let commsProvider: WebsocketProvider | null = null;

export function getCollabProvider(sessionId: string, userId: string) {
  if (yCodeDoc && codeProvider) return { yCodeDoc, codeProvider };

  if (!yCodeDoc && !codeProvider) {
    // console.log('called');
    yCodeDoc = new Y.Doc();
    const wsUrl =
      process.env.NEXT_PUBLIC_COLLAB_WSSERVER_URL || 'ws://localhost:3009';
    codeProvider = new WebsocketProvider(
      wsUrl,
      `${sessionId}?userId=${userId}`,
      yCodeDoc,
      {
        connect: true,
      },
    );
    return { yCodeDoc, codeProvider };
  }
}

export function getCommsProvider(
  sessionId: string,
  userId: string,
): { yCommsDoc: Y.Doc; commsProvider: WebsocketProvider } {
  if (!yCommsDoc || !commsProvider) {
    // console.log(
    //   `Calling getCommsProvider sessId: ${sessionId}, userid: ${userId}`,
    // );
    yCommsDoc = new Y.Doc();

    const wsUrl =
      process.env.NEXT_PUBLIC_API_COMMS_SERVICE || 'ws://localhost:3012';

    commsProvider = new WebsocketProvider(
      wsUrl,
      `${sessionId}?userId=${userId}`,
      yCommsDoc,
      {
        connect: true,
      },
    );
  }

  return { yCommsDoc, commsProvider };
}

export function ProviderIsUndefined() {
  return yCodeDoc === undefined || codeProvider || undefined;
}

export function removeCollabProvider() {
  if (!yCodeDoc) return;

  setTimeout(() => {
    if (codeProvider) {
      codeProvider.destroy(); // Disconnects from server
      codeProvider = null;
    }

    if (yCodeDoc) {
      yCodeDoc.destroy(); // Clears all Yjs state & events
      yCodeDoc = null;
    }

    // console.log('Collab provider removed');
  }, 3000);
}

export function removeCommsProvider() {
  if (!yCommsDoc) return;

  setTimeout(() => {
    if (commsProvider) {
      commsProvider.destroy(); // Disconnects from server
      commsProvider = null;
    }

    if (yCommsDoc) {
      yCommsDoc.destroy(); // Clears all Yjs state & events
      yCommsDoc = null;
    }

    // console.log('Comms provider removed');
  }, 3000);
}
