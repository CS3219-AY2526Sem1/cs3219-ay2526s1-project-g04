'use client';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
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

export const MessageBoard = () => {
  const messages = [
    {
      username: 'CoderHuang',
      content: 'Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem',
      time: '1/1/1',
    },
    {
      username: 'Kailash201',
      content: 'Lorem Lorem Lorem',
      time: '1/1/1',
    },
    {
      username: 'CoderHuang',
      content: 'Lorem Lorem Lorem',
      time: '1/1/1',
    },
    {
      username: 'CoderHuang',
      content: 'Lorem Lorem Lorem',
      time: '1/1/1',
    },
  ];
  const curUserName = 'Kailash201';
  const isCurUser = (userName: string) => {
    return curUserName === userName;
  };

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
      <CardContent
        // sx={{ height: '100%' }}
        className="min-h-8/10 flex-1 pb-1 justify-between"
      >
        <Stack className="h-full">
          <Stack spacing={2} className="h-full overflow-auto pb-4">
            {messages.map((data, idx) => {
              return isCurUser(data.username) ? (
                <Stack
                  key={idx}
                  className="nowrap max-w-9/10 min-w-1/2 self-end"
                >
                  <Paper
                    elevation={0}
                    square={false}
                    className="bg-gray-100 py-1 px-2"
                  >
                    <Typography variant="body2">{data.content}</Typography>
                  </Paper>
                  <Typography variant="caption" className="self-start">
                    {data.time}
                  </Typography>
                </Stack>
              ) : (
                <Stack
                  key={idx}
                  className="nowrap max-w-9/10 min-w-1/2 self-start"
                >
                  <Paper
                    elevation={0}
                    square={false}
                    className="bg-gray-100 py-1 px-2"
                  >
                    <Typography variant="body2">{data.content}</Typography>
                  </Paper>
                  <Typography variant="caption" className="self-end">
                    {data.time}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
          <OutlinedInput
            placeholder={'Message'}
            size="small"
            className="rounded-full text-sm w-full min-h-fit mb-2"
            endAdornment={
              <IconButton>
                <SendIcon></SendIcon>
              </IconButton>
            }
          />
        </Stack>
      </CardContent>
    </Card>
  );
};
