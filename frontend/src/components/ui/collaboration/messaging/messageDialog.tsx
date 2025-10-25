import { Paper, Stack, Typography } from '@mui/material';
import '@/styles/globals.css';

export const MessageDialogs = () => {
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
    <Stack spacing={2} className="h-full overflow-auto pb-4">
      {messages.map((data, idx) => {
        return isCurUser(data.username) ? (
          <Stack key={idx} className="nowrap max-w-9/10 min-w-1/2 self-end">
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
          <Stack key={idx} className="nowrap max-w-9/10 min-w-1/2 self-start">
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
  );
};
