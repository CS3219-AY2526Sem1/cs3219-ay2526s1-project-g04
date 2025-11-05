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

interface ChatMessage {
  id: string;
  text: string;
  user: string;
  timestamp: number;
}

interface StrokeData {
  id: string;
  userId: string;
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

interface CollabContextType {
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  awareness: WebsocketProvider['awareness'] | null;
  messages: Y.Array<ChatMessage> | null;
  strokes: Y.Array<StrokeData> | null;
  sendMessage: (text: string, user: string) => void;
  userId: string;
  sessionId: string;
}

const CollabContext = createContext<CollabContextType | undefined>(undefined);

export function CollabProvider({ children }: { children: React.ReactNode }) {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [awareness, setAwareness] = useState<
    WebsocketProvider['awareness'] | null
  >(null);
  const [messages, setMessages] = useState<Y.Array<ChatMessage> | null>(null);
  const [strokes, setStrokes] = useState<Y.Array<StrokeData> | null>(null);
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlUserId = params.get('userId') || crypto.randomUUID();
    const urlSessionId = params.get('sessionId') || 'default-session';

    setUserId(urlUserId);
    setSessionId(urlSessionId);

    // setup Yjs doc & websocket provider
    const doc = new Y.Doc();
    const wsUrl =
      process.env.NEXT_PUBLIC_COLLAB_SERVER_URL || 'ws://localhost:3009';

    const wsProvider = new WebsocketProvider(
      wsUrl,
      `${urlSessionId}?userId=${urlUserId}`,
      doc,
      { connect: true },
    );

    const awareness = wsProvider.awareness;

    // set local presence
    awareness.setLocalStateField('user', {
      id: urlUserId,
      color: '#7E57C2',
      name: `User-${urlUserId.substring(0, 4)}`,
    });

    // awareness debug logs
    awareness.on('change', () => {
      const states = awareness.getStates();
      states.forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;
        const user = state.user;
        const cursor = state.cursor;
        if (cursor) {
          console.log(`[Awareness] ${user?.name || clientId} cursor:`, cursor);
        }
      });
    });

    // shared Yjs arrays
    const yMessages = doc.getArray<ChatMessage>('messages');
    const yStrokes = doc.getArray<StrokeData>('strokes');

    setYdoc(doc);
    setProvider(wsProvider);
    setAwareness(awareness);
    setMessages(yMessages);
    setStrokes(yStrokes);

    console.log(
      `[CollabProvider] Connected to "${urlSessionId}" as "${urlUserId}"`,
    );

    return () => {
      wsProvider.disconnect();
      wsProvider.destroy();
      doc.destroy();
    };
  }, []);

  // 💬 send chat message
  const sendMessage = useCallback(
    (text: string, user: string) => {
      if (!messages) return;
      const msg: ChatMessage = {
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
