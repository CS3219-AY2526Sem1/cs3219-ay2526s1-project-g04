'use client';

import { sessionIsReady } from '@/services/collaborationServiceApi';
import { Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface props {
  sessionId: string;
}

export const WaitingSessionToBeCreatedPopUp = (p: props) => {
  const router = useRouter();
  const { sessionId } = p;
  useEffect(() => {
    // eslint-disable-next-line prefer-const
    let intervalId: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const isReady = await sessionIsReady(sessionId);
        if (isReady) {
          clearInterval(intervalId);
          router.push(`/collaboration/${sessionId}`);
        }
      } catch {
        clearInterval(intervalId);
      }
    };

    // start polling every 0.5 seconds
    intervalId = setInterval(pollStatus, 500);

    pollStatus();

    return () => clearInterval(intervalId);
  }, [router]);

  return <Typography>Session is being created</Typography>;
};
