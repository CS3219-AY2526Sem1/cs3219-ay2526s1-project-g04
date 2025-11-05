import { Box, Stack } from '@mui/material';
import CollabMonaco from './CollabMonaco';
import { Communication } from './communication';
import { QuestionCard } from './question';
import { TestCases } from './tests';
import { getCollabProvider } from './collabSingleton';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sessionIsAlive } from '@/services/collaborationServiceApi';

interface CollaborationProps {
  sessionId: string;
}

interface NotificationMessage {
  type: 'user-left';
  userId: string;
  timestamp?: number;
}

export const Collaboration = (p: CollaborationProps) => {
  const { sessionId } = p;
  const userId = '1';
  const [providers, setProviders] = useState<ReturnType<
    typeof getCollabProvider
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
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
  const router = useRouter();

  notifications.observe((event) => {
    event.changes.keys.forEach((change, key) => {
      if (change.action === 'add' || change.action === 'update') {
        const message = notifications.get(key);
        console.log(message);
        if (message && message.userId === userId) return;

        if (message && message.type === 'user-left') {
          alert(
            `User ${message.userId} left the session, you will be redirected to the home page`,
          );
          router.push('/home/dashboard');
        }
      }
    });
  });

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
