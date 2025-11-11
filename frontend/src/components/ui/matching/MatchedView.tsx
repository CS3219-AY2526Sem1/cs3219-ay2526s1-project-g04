'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sessionIsReady } from '@/services/collaborationServiceApi';
import { getCollabProvider } from '../collaboration/collabSingleton';
import { getUserId } from '@/lib/utils/jwt';

interface MatchedViewProps {
  matchingId: string;
  onTimeout: () => void;
}

export default function MatchedView({
  matchingId,
  onTimeout,
}: MatchedViewProps) {
  const router = useRouter();
  const [createProcessIsDone, setCreateProcessIsDone] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line prefer-const
    let intervalId: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const { sessionId, created, ready } = await sessionIsReady(
          `matched:${matchingId}`,
        );
        console.log(sessionId, created, createProcessIsDone);
        if (created && sessionId) {
          console.log('adding user into socket', matchingId);
          getCollabProvider(sessionId, getUserId()!.toString());
          setCreateProcessIsDone(true);
        }
        if (ready && sessionId) {
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

  // timeout for redirecting
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      alert(
        'An unexpected error occurred and we were unable to start collaboration session.',
      );
      onTimeout();
    }, 90 * 1000);

    return () => clearTimeout(timeoutId);
  }, [onTimeout]);

  return (
    <div className="flex flex-col items-center text-center space-y-5 w-full">
      <h1 className="text-violet-500">We found you a peer!</h1>
      <p className="text-gray-500">
        Hang tight, you will be automatically redirected to your collaboration
        space.
        <br />
        This will only take a few seconds...
      </p>

      <Image
        src="/spinner.gif"
        alt="Loading topics..."
        width={96}
        height={96}
        unoptimized
      />
    </div>
  );
}
