import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useRouter, useSearchParams } from 'next/navigation';

let yCodeDoc: Y.Doc | null = null;
let codeProvider: WebsocketProvider | null = null;

export function getCollabProvider(sessionId: string, userId: string) {
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
  }
  if (yCodeDoc && codeProvider) return { yCodeDoc, codeProvider };
}

export function getCollabProvider2() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get query parameter
  const userId = searchParams.get('userId'); // "1"
  // Get dynamic route parameter
  const sid = searchParams.get('sid'); // "1"

  // If your file is pages/collaboration/[sessionId].tsx
  const sessionId = '48';
  // setCollabProvider(sid ?? '0', userId ?? '0');
  if (yCodeDoc && codeProvider) return { yCodeDoc, codeProvider };
}

export function removeCollabProvider() {
  if (!yCodeDoc) return;

  const userId = '1';
  const yNotifications = yCodeDoc.getMap('notifications');
  yNotifications.set(
    `your coding buddy has left, you will be redirected to the home page-${Date.now()}`,
    {
      type: 'user-left',
      userId,
    },
  );

  if (codeProvider) {
    codeProvider.destroy(); // Disconnects from server
    codeProvider = null;
  }

  if (yCodeDoc) {
    yCodeDoc.destroy(); // Clears all Yjs state & events
    yCodeDoc = null;
  }

  console.log('Collab provider removed');
}
