import { Box, Stack } from '@mui/material';
import CollabMonaco from './CollabMonaco';
import { Communication } from './communication';
import { QuestionCard } from './question';
import { TestCases } from './tests';
import { getCollabProvider } from './collabSingleton';
import { useRouter } from 'next/navigation';

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
  const providers = getCollabProvider();
  if (!providers) {
    alert('session not ready');
    return;
  }
  const { yCodeDoc, codeProvider } = providers;
  const notifications = yCodeDoc.getMap<NotificationMessage>('notifications');
  const router = useRouter();

  const userId = '1';
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
