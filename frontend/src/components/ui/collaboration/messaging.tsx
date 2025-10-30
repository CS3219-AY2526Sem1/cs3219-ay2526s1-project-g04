'use client';

import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Typography,
  Box,
} from '@mui/material';
import '@/styles/globals.css';
import { UserInput } from './messaging/userInput';
import { MessageDialogs } from './messaging/messageDialog';
import { CollabProvider, useCollab } from './CollabProvider';
import React from 'react';

const ChatHeader = () => {
  const { awareness, userId } = useCollab();
  const [otherUser, setOtherUser] = React.useState<{ id: string } | null>(null);

  React.useEffect(() => {
    if (!awareness) return;

    const update = () => {
      const states = Array.from(awareness.getStates().values());
      const others = states
        .map((s: any) => s.user)
        .filter((u) => u && u.id !== userId);
      setOtherUser(others[0] || null);
    };

    update();
    awareness.on('change', update);
    return () => awareness.off('change', update);
  }, [awareness, userId]);

  return (
    <CardHeader
      className="py-2 px-3 h-fit border-b border-[#777889]"
      title={
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar className="bg-purple-500">
            {otherUser?.id ? otherUser.id.substring(0, 2).toUpperCase() : '?'}
          </Avatar>
          <Typography className="text-white font-semibold">
            {otherUser?.id || 'Waiting for collaborator...'}
          </Typography>
        </Stack>
      }
    />
  );
};

export const MessageBoard = () => {
  return (
    <CollabProvider>
      <Card
        className="flex flex-col w-full h-full shadow-none"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden', // ✅ ensures internal scroll only
        }}
      >
        <ChatHeader />

        {/* Scrollable content area */}
        <CardContent
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden', // prevent outer overflow
            p: 0,
          }}
        >
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto', // ✅ makes messages scrollable
              px: 2,
              py: 1,
            }}
          >
            <MessageDialogs />
          </Box>

          {/* Fixed input bar at bottom */}
          <Box>
            <UserInput />
          </Box>
        </CardContent>
      </Card>
    </CollabProvider>
  );
};
