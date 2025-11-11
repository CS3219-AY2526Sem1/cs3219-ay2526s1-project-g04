import React, { useState } from 'react';
import { IconButton, TextField, InputAdornment, Box } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import * as Y from 'yjs';

interface ChatMessage {
  id: string;
  text: string;
  user: string;
  timestamp: number;
}

interface UserInputProps {
  yCommsDoc: Y.Doc;
  userId: string;
}

export const UserInput = ({ yCommsDoc, userId }: UserInputProps) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || !yCommsDoc || !userId) return;

    const yMessages = yCommsDoc.getArray<ChatMessage>('messages');

    const message: ChatMessage = {
      id: userId,
      text: input.trim(),
      user: userId,
      timestamp: Date.now(),
    };

    yMessages.push([message]);
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
