import { Box, Stack, Typography } from '@mui/material';
import CollabMonaco from './CollabMonaco';
import { Communication } from './communication';
import { QuestionCard } from './question';
import { TestCases } from './tests';
import {
  getCollabProvider,
  ProviderIsUndefined,
  removeCollabProvider,
  removeCommsProvider,
} from './collabSingleton';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sessionIsAlive } from '@/services/collaborationServiceApi';
import { getUserId } from '@/lib/utils/jwt';
import { useCodeContext } from './CodeContext';
import { YMapEvent } from 'yjs';
import Image from 'next/image';
import { useSnackbar } from '../notifContext';

interface CollaborationProps {
  sessionId: string;
}

interface NotificationMessage {
  type?: string;
  senderId: string;
  message: string;
  timestamp?: number;
}

export const Collaboration = (p: CollaborationProps) => {
  const { sessionId } = p;
  const userId = getUserId()!.toString();

  const { setSessionId } = useCodeContext();
  const { showNotification } = useSnackbar();
  const [providers, setProviders] = useState<ReturnType<
    typeof getCollabProvider
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setSessionId(sessionId);
  }, [sessionId, setSessionId]);

  useEffect(() => {
    (async () => {
      if (!ProviderIsUndefined) {
        setProviders(getCollabProvider(sessionId, userId));
        return;
      }
      setLoading(true);
      const alive = await sessionIsAlive(sessionId);
      console.log('ping');
      if (!alive) {
        setLoading(false);
        return;
      }

      const provider = getCollabProvider(sessionId, userId);
      if (provider) {
        setProviders(provider);
        setLoading(false);
      }
    })();
  }, []);
  if (loading) {
    return (
      <Box className="w-full h-full flex justify-center">
        <Stack className="h-full w-full flex justify-center">
          <Image
            className="h-fit self-center"
            src="/spinner.gif"
            alt="Loading topics..."
            width={96}
            height={96}
            unoptimized
          />
          <Typography className="self-center" variant={'h6'}>
            Spinning up your session ...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!providers) {
    return (
      <Typography className="justify-self-center self-center" variant="h5">
        Oops, you do not have any session, please start a session from your
        homepage
      </Typography>
    );
  }

  const { yCodeDoc, codeProvider } = providers;

  const notifications = yCodeDoc.getMap<NotificationMessage>('notifications');

  const observer = (event: YMapEvent<NotificationMessage>) => {
    event.keys.forEach((change, key: string) => {
      if (change.action === 'add') {
        const value = notifications.get(key);
        if (value && value.senderId.toString() !== getUserId()!.toString()) {
          showNotification(value.message);
          notifications.delete(key);
          if (value?.type === 'end') {
            setTimeout(() => {
              removeCollabProvider();
              removeCommsProvider();
              router.push('/home/dashboard');
            }, 10000);
          }
        }
      }
    });
  };
  notifications.observe(observer);

  return (
    <Stack spacing={2} direction="row" className="h-full w-full">
      <Stack spacing={2} className="h-full w-1/2">
        <QuestionCard sessionId={sessionId}></QuestionCard>
        <Communication></Communication>
      </Stack>
      <Stack spacing={2} className="h-full w-1/2">
        <Box className="flex w-full h-60/100">
          <CollabMonaco
            yCodeDoc={yCodeDoc}
            codeProvider={codeProvider}
          ></CollabMonaco>
        </Box>
        <Box className="flex w-full h-40/100">
          <TestCases></TestCases>
        </Box>
      </Stack>
    </Stack>
  );
};
