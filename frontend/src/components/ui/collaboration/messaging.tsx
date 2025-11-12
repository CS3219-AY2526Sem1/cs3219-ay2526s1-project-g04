'use client';

import React from 'react';
import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Typography,
  Box,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import '@/styles/globals.css';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { MessageDialogs } from './messaging/messageDialog';
import { UserInput } from './messaging/userInput';

interface AwarenessUser {
  id: string;
  name?: string;
  color?: string;
}

interface MessageBoardProps {
  yCommsDoc: Y.Doc;
  awareness: Awareness | null;
  userId: string;
  username: string;
  otherUser: AwarenessUser | null;
}

const ChatHeader = ({ otherUser }: { otherUser: AwarenessUser | null }) => (
  <CardHeader
    className="py-2 px-3 h-fit border-b border-[#e0e0e0]"
    title={
      <Stack direction="row" alignItems="center" spacing={2}>
        <Avatar sx={{ bgcolor: '#ded0ff', color: '#8b5cf7' }}>
          <PersonOutlineIcon sx={{ fontSize: 30 }} />
        </Avatar>
        <Typography className="font-semibold">
          {otherUser?.name || 'Waiting for collaborator...'}
        </Typography>
      </Stack>
    }
  />
);

export const MessageBoard = ({
  yCommsDoc,
  awareness,
  userId,
  username,
  otherUser,
}: MessageBoardProps) => {
  return (
    <Card
      className="flex flex-col w-full h-full shadow-none"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <ChatHeader otherUser={otherUser} />

      <CardContent
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          p: 0,
        }}
      >
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1 }}>
          <MessageDialogs yCommsDoc={yCommsDoc} userId={userId} />
        </Box>

        <Box>
          <UserInput yCommsDoc={yCommsDoc} userId={userId} />
        </Box>
      </CardContent>
    </Card>
  );
};
