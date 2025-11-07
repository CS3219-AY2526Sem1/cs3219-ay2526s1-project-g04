import { Box, Stack } from '@mui/material';
import CollabMonaco from './CollabMonaco';
import { Communication } from './communication';
import { QuestionCard } from './question';
import { TestCases } from './tests';
import { getCollabProvider, ProviderIsUndefined } from './collabSingleton';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sessionIsAlive } from '@/services/collaborationServiceApi';
import { getUserId } from '@/getUserId';
import { useCodeContext } from './CodeContext';

interface CollaborationProps {
  sessionId: string;
}

interface NotificationMessage {
  senderId: 'user-left';
  message: string;
  timestamp?: number;
}

export const Collaboration = (p: CollaborationProps) => {
  const { sessionId } = p;
  const userId = getUserId().toString();

  const { setSessionId } = useCodeContext();
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
    return <h1>Loading session...</h1>;
  }

  if (!providers) {
    return <h1>Oppsss, start session from home page</h1>;
  }

  const { yCodeDoc, codeProvider } = providers;

  const notifications = yCodeDoc.getMap<NotificationMessage>('notifications');

  const observer = (event: any) => {
    event.keys.forEach((change: any, key: any) => {
      if (change.action === 'add') {
        const value = notifications.get(key);
        if (value && value.senderId.toString() !== getUserId().toString()) {
          alert(value.message);
          router.push('/home/dashboard');
        }

        notifications.delete(key);
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
