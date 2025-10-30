'use client';

import React, { useState } from 'react';
import { useCollab } from '../CollabProvider';
import { IconButton, TextField, InputAdornment, Box } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

export const UserInput = () => {
  const { sendMessage, userId } = useCollab();
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input, userId);
    setInput('');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 1,
        bgcolor: 'white',
        borderTop: '1px solid #e5e7eb',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
      }}
    >
      <TextField
        variant="outlined"
        size="small"
        fullWidth
        placeholder="Type a message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
          }
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '9999px',
            bgcolor: '#f9fafb',
          },
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={handleSend}>
                <SendIcon sx={{ color: '#7C3AED' }} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
};
