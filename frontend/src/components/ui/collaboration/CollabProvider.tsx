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
  yCodeDoc: Y.Doc | null;
  codeProvider: WebsocketProvider | null;
  userId: string;
  sessionId: string;
}

interface CollabProviderProps {
  children: React.ReactNode;
  userId: string;
  sessionId: string;
}

const CollabContext = createContext<CollabContextType | undefined>(undefined);

export function CollabProvider(p: CollabProviderProps) {
  const { children, userId, sessionId } = p;
  const [yCodeDoc, setYCodeDoc] = useState<Y.Doc | null>(null);
  const [codeProvider, setCodeProvider] = useState<WebsocketProvider | null>(
    null,
  );

  useEffect(() => {
    // setup Yjs doc & websocket provider
    const codeDoc = new Y.Doc();
    const wsUrl =
      process.env.NEXT_PUBLIC_COLLAB_WSSERVER_URL || 'ws://localhost:3009';

    const codeWSProvider = new WebsocketProvider(
      wsUrl,
      `${sessionId}?userId=${userId}`,
      codeDoc,
      { connect: true },
    );

    setYCodeDoc(codeDoc);
    setCodeProvider(codeWSProvider);
    console.log(`[CollabProvider] Connected to "${sessionId}" as "${userId}"`);

    return () => {
      codeWSProvider.disconnect();
      codeWSProvider.destroy();
      codeDoc.destroy();
    };
  }, []);

  // 💬 send chat message

  return (
    <CollabContext.Provider
      value={{
        yCodeDoc,
        codeProvider,
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
