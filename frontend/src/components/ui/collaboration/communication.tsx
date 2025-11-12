'use client';

import React, { useEffect, useState } from 'react';
import { Box, Card, Stack, Typography } from '@mui/material';
import '@/styles/globals.css';
import { MessageBoard } from './messaging';
import { getCommsProvider } from './collabSingleton';
import { getUserId, getUsername } from '@/lib/utils/jwt';
import { useCodeContext } from '../collaboration/CodeContext';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { DrawingBoard } from './drawing';

interface AwarenessUser {
  id: string;
  name?: string;
  color?: string;
}

interface AwarenessState {
  user?: AwarenessUser;
}

export const Communication = () => {
  const { sessionId } = useCodeContext();
  const userId = getUserId();
  const username = getUsername();

  const [yCommsDoc, setYCommsDoc] = useState<Y.Doc | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  const [otherUser, setOtherUser] = useState<AwarenessUser | null>(null);

  useEffect(() => {
    if (!userId || !sessionId) return;

    const { yCommsDoc, commsProvider } = getCommsProvider(
      sessionId,
      String(userId),
    );
    setYCommsDoc(yCommsDoc);

    const awarenessInstance = commsProvider.awareness;
    setAwareness(awarenessInstance);

    // Set local awareness info
    awarenessInstance.setLocalStateField('user', {
      id: String(userId),
      name: username ?? `User-${userId}`,
      color: '#8b5cf7',
    });

    // Handle updates for other users
    const handleUpdate = () => {
      const states = Array.from(
        awarenessInstance.getStates().values(),
      ) as AwarenessState[];

      const others = states
        .map((s) => s.user)
        .filter((u): u is AwarenessUser => !!u && u.id !== String(userId));

      setOtherUser(others[0] || null);
    };

    handleUpdate();
    awarenessInstance.on('change', handleUpdate);

    return () => awarenessInstance.off('change', handleUpdate);
  }, [sessionId, userId, username]);

  if (!yCommsDoc) {
    return (
      <Card className="flex flex-col w-full h-full items-center justify-center">
        <Typography>Connecting communication service...</Typography>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-2xl h-full w-full" variant="outlined">
      <Stack direction="row" className="flex justify-center h-full">
        {/* Message board (chat) */}
        <MessageBoard
          yCommsDoc={yCommsDoc}
          awareness={awareness}
          userId={String(userId)}
          username={username ?? `User-${userId}`}
          otherUser={otherUser}
        />

        {/* Drawing board (shared canvas) */}
        <Box className="flex w-full h-full p-2">
          <DrawingBoard yCommsDoc={yCommsDoc} userId={String(userId)} />
        </Box>
      </Stack>
    </Card>
  );
};
