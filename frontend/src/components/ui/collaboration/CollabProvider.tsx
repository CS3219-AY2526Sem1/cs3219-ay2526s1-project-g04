'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface CollabContextType {
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  awareness: WebsocketProvider['awareness'] | null;
  messages: Y.Array<any> | null;
  strokes: Y.Array<any> | null;
  sendMessage: (text: string, user: string) => void;
  userId: string;
  sessionId: string;
}

const CollabContext = createContext<CollabContextType>({
  ydoc: null,
  provider: null,
  awareness: null,
  messages: null,
  strokes: null,
  sendMessage: () => {},
  userId: '',
  sessionId: '',
});

export function CollabProvider({ children }: { children: React.ReactNode }) {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [awareness, setAwareness] = useState<
    WebsocketProvider['awareness'] | null
  >(null);
  const [messages, setMessages] = useState<Y.Array<any> | null>(null);
  const [strokes, setStrokes] = useState<Y.Array<any> | null>(null);
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    // Extract session/user from URL
    const params = new URLSearchParams(window.location.search);
    const urlUserId = params.get('userId') || crypto.randomUUID();
    const urlSessionId = params.get('sessionId') || 'default-session';

    setUserId(urlUserId);
    setSessionId(urlSessionId);

    // Setup Yjs + WebSocket connection
    const ydoc = new Y.Doc();
    const wsUrl =
      process.env.NEXT_PUBLIC_COLLAB_SERVER_URL || 'ws://localhost:3000';

    const provider = new WebsocketProvider(
      wsUrl,
      `${urlSessionId}?userId=${urlUserId}`,
      ydoc,
      {
        connect: true,
      },
    );

    const awareness = provider.awareness;

    // Set local presence data (optional — can be empty if you don't want self)
    awareness.setLocalStateField('user', {
      id: urlUserId,
      color: '#7E57C2',
      name: `User-${urlUserId.substring(0, 4)}`,
    });

    // Monitor awareness updates (for cursor or presence tracking)
    awareness.on('change', () => {
      const states = awareness.getStates();
      states.forEach((state, clientId) => {
        if (clientId === awareness.clientID) return; // skip self
        const user = state.user;
        const cursor = state.cursor;
        if (cursor) {
          console.log(
            `[Awareness] User ${user?.name || clientId} cursor:`,
            cursor,
          );
        }
      });
    });

    // Shared Yjs arrays
    const yMessages = ydoc.getArray('messages');
    const yStrokes = ydoc.getArray('strokes');

    setYdoc(ydoc);
    setProvider(provider);
    setAwareness(awareness);
    setMessages(yMessages);
    setStrokes(yStrokes);

    console.log(
      `[CollabProvider] Connected to "${urlSessionId}" as user "${urlUserId}"`,
    );

    // Cleanup
    return () => {
      provider.disconnect();
      provider.destroy();
      ydoc.destroy();
    };
  }, []);

  // 💬 Send chat/message
  const sendMessage = useCallback(
    (text: string, user: string) => {
      if (!messages) return;
      const msg = {
        id: crypto.randomUUID(),
        text,
        user,
        timestamp: Date.now(),
      };
      messages.push([msg]);
    },
    [messages],
  );

  return (
    <CollabContext.Provider
      value={{
        ydoc,
        provider,
        awareness,
        messages,
        strokes,
        sendMessage,
        userId,
        sessionId,
      }}
    >
      {children}
    </CollabContext.Provider>
  );
}

export function useCollab() {
  const ctx = useContext(CollabContext);
  if (!ctx) throw new Error('useCollab must be used within a CollabProvider');
  return ctx;
}
