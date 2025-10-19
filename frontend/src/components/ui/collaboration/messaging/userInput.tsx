'use client';

import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  OutlinedInput,
  Paper,
  Stack,
  StyledEngineProvider,
  TextField,
  Typography,
} from '@mui/material';
import '@/styles/globals.css';
import SendIcon from '@mui/icons-material/Send';
import { useState, useEffect } from 'react';

export const UserInput = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return;
  }
  return (
    <OutlinedInput
      placeholder="Message"
      size="small"
      className="rounded-full text-sm w-full min-h-fit mb-2"
      endAdornment={
        <IconButton>
          <SendIcon></SendIcon>
        </IconButton>
      }
    />
  );
};
