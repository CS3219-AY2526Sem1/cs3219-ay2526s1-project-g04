import React, { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { Stack, Typography, Box } from '@mui/material';

interface ChatMessage {
  id: string;
  text: string;
  user: string;
  timestamp: number;
}

interface MessageDialogsProps {
  yCommsDoc: Y.Doc;
  userId: string;
}

export const MessageDialogs = ({ yCommsDoc, userId }: MessageDialogsProps) => {
  const [chatList, setChatList] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!yCommsDoc) {
      // console.error('Missing yCommsDoc — cannot initialize MessageDialogs');
      return;
    }

    const yMessages = yCommsDoc.getArray<ChatMessage>('messages');

    const update = () => setChatList(yMessages.toArray());
    update(); // initial load
    yMessages.observe(update);

    // cleanup on unmount
    return () => {
      yMessages.unobserve(update);
    };
  }, [yCommsDoc]);

  return (
    <Stack spacing={2} className="flex-1 overflow-y-auto p-2">
      {chatList.map((msg, idx) => {
        const isOwn = msg.user === userId;

        return (
          <Box
            key={`${msg.id}-${msg.timestamp ?? idx}`}
            display="flex"
            flexDirection="column"
            alignItems={isOwn ? 'flex-end' : 'flex-start'}
          >
            {/* Message bubble */}
            <Box
              sx={{
                px: 2,
                py: 1.2,
                borderRadius: 3,
                maxWidth: '70%',
                bgcolor: isOwn ? '#8b5cf7' : '#f1f1f1',
                color: isOwn ? 'white' : '#222',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isOwn ? 400 : 500,
                  opacity: 0.9,
                }}
              >
                {msg.text}
              </Typography>
            </Box>

            {/* Timestamp */}
            <Typography
              variant="caption"
              sx={{
                textAlign: isOwn ? 'right' : 'left',
                color: '#797979ff',
                fontSize: '0.7rem',
                mt: 0.3,
                ml: isOwn ? 0 : 1,
                mr: isOwn ? 1 : 0,
              }}
            >
              {msg.timestamp
                ? new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
};
