'use client';

import React, { useEffect, useState } from 'react';
import { useCollab } from '../CollabProvider';
import { Stack, Avatar, Typography, Box } from '@mui/material';

export const MessageDialogs = () => {
  const { messages, userId } = useCollab();
  const [chatList, setChatList] = useState<any[]>([]);

  useEffect(() => {
    if (!messages) return;

    const update = () => setChatList(messages.toArray());
    update(); // initial load
    messages.observe(update);

    return () => messages.unobserve(update);
  }, [messages]);

  return (
    <Stack spacing={2} className="flex-1 overflow-y-auto p-2">
      {chatList.map((msg, idx) => {
        const isOwn = msg.user === userId;

        return (
          <Box
            key={idx}
            display="flex"
            flexDirection={isOwn ? 'row-reverse' : 'row'}
            alignItems="flex-end"
            gap={1}
          >
            {/* Avatar */}
            <Avatar
              sx={{
                bgcolor: isOwn ? '#7C3AED' : '#A78BFA',
                color: 'white',
                fontSize: 14,
              }}
            >
              {msg.user?.[0]?.toUpperCase() || '?'}
            </Avatar>

            {/* Message bubble */}
            <Box
              sx={{
                px: 2,
                py: 1.2,
                borderRadius: 3,
                borderTopLeftRadius: isOwn ? 3 : 0,
                borderTopRightRadius: isOwn ? 0 : 3,
                maxWidth: '70%',
                bgcolor: isOwn ? '#7C3AED' : '#f1f1f1',
                color: isOwn ? 'white' : '#222',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isOwn ? 400 : 500,
                  mb: 0.3,
                  opacity: 0.9,
                }}
              >
                {msg.text}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  textAlign: isOwn ? 'right' : 'left',
                  color: isOwn ? 'rgba(255,255,255,0.7)' : '#777',
                  mt: 0.2,
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
          </Box>
        );
      })}
    </Stack>
  );
};
