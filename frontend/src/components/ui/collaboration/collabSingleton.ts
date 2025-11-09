import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useRouter, useSearchParams } from 'next/navigation';
import { getUserId } from '@/lib/utils/jwt';

let yCodeDoc: Y.Doc | null = null;
let codeProvider: WebsocketProvider | null = null;

export function getCollabProvider(sessionId: string, userId: string) {
  if (yCodeDoc && codeProvider) return { yCodeDoc, codeProvider };

  if (!yCodeDoc && !codeProvider) {
    console.log('called');
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

export function ProviderIsUndefined() {
  return yCodeDoc === undefined || codeProvider || undefined;
}

export function removeCollabProvider() {
  if (!yCodeDoc) return;

  const yNotifications = yCodeDoc.getMap('notifications');
  const messagePayload = {
    senderId: getUserId(),
    message:
      'your coding buddy has left, you will be redirected to the home page',
    timestamp: Date.now(),
  };
  yNotifications.set(Date.now().toString(), messagePayload);

  setTimeout(() => {
    if (codeProvider) {
      codeProvider.destroy(); // Disconnects from server
      codeProvider = null;
    }

    if (yCodeDoc) {
      yCodeDoc.destroy(); // Clears all Yjs state & events
      yCodeDoc = null;
    }

    console.log('Collab provider removed');
  }, 1000);
}
