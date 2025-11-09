'use client';

import * as React from 'react';
import Image from 'next/image';
import { getMatchStatus } from '@/services/matchingServiceApi';
import { getUserId } from '@/lib/utils/jwt';
import { type MatchState, TOTAL_MATCH_TIME } from '@/lib/constants/MatchTypes';

interface LoadingViewProps {
  setMatchState: React.Dispatch<React.SetStateAction<MatchState>>;
}

interface ProgressBarProps {
  progressPercent: number;
}

function ProgressBar({ progressPercent }: ProgressBarProps) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mt-10 p-[3px]">
      <div
        className="bg-violet-500 rounded-full h-full transition-all duration-500 ease-in-out"
        style={{ width: `${progressPercent}%` }}
      ></div>
    </div>
  );
}

export default function LoadingView({ setMatchState }: LoadingViewProps) {
  const [remainingTime, setRemainingTime] = React.useState(TOTAL_MATCH_TIME);

  // poll match status every 1 second
  const fetchStatus = async () => {
    try {
      const res = await getMatchStatus(getUserId()!.toString());
      if (!res.success) return;

      const status = res.data?.status;
      const timeLeft = res.data?.remainingTime ?? TOTAL_MATCH_TIME;

      setRemainingTime(timeLeft);

      if (status === 'matched') {
        setMatchState({
          status: 'matched',
          matchingId: res.data?.matchingId ?? '',
        });
      } else if (status === 'timeout') {
        setMatchState({ status: 'timeout' });
      } else if (status === 'cancelled' || status === 'disconnected') {
        alert(
          'Looks like there was an error. The server has detected you have disconnected.',
        );
        setMatchState({ status: 'requesting' });
        return;
      }
    } catch (error) {
      console.error('Error fetching match status:', error);
    }
  };

  React.useEffect(() => {
    fetchStatus();

    const intervalId = setInterval(fetchStatus, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const progressPercentage =
    ((TOTAL_MATCH_TIME - remainingTime) / TOTAL_MATCH_TIME) * 100;
  const minutesLeft = Math.floor(remainingTime / 60);

  return (
    <div className="flex flex-col items-center text-center space-y-5 w-full max-w-md mx-auto">
      <h1 className="text-violet-500">Hang tight!</h1>
      <p className="text-gray-500">
        We are matching you with your perfect coding partner...
      </p>

      <Image
        src="/spinner.gif"
        alt="Loading topics..."
        width={96}
        height={96}
        unoptimized
      />

      <ProgressBar progressPercent={progressPercentage} />

      <p className="text-gray-500">
        {minutesLeft >= 1
          ? `${minutesLeft} minutes left`
          : `Less than 1 minute left`}
      </p>
    </div>
  );
}
