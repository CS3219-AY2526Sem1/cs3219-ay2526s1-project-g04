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
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import { useEffect, useRef, useState } from 'react';
import { UserInput } from './messaging/userInput';
import { MessageDialogs } from './messaging/messageDialog';

export const MessageBoard = () => {
  return (
    <Card className="flex flex-col w-full h-full shadow-none">
      <CardHeader
        className="py-2 px-3 h-fit"
        title={
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar className="bg-purple-500">CH</Avatar>
            <Typography>CoderHuang</Typography>
          </Stack>
        }
      ></CardHeader>
      <CardContent className="min-h-8/10 flex-1 pb-1 justify-between">
        <Stack className="h-full">
          <MessageDialogs></MessageDialogs>
          <UserInput></UserInput>
        </Stack>
      </CardContent>
    </Card>
  );
};
