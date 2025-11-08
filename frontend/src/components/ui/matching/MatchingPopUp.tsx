'use client';

import * as React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@mui/material';
import { deleteMatchRequest } from '@/services/matchingServiceApi';
import MatchingForm from './MatchingForm';
import LoadingView from './LoadingView';
import MatchedView from './MatchedView';
import { type MatchState } from '@/lib/constants/MatchTypes';
import TimeoutView from './TimeoutView';
import { getUserId } from '@/lib/utils/jwt';

interface MatchingPopUpProps {
  setShowMatching: React.Dispatch<React.SetStateAction<boolean>>;
}

interface CloseButtonProps {
  sendCancelReq?: boolean;
  onClick: () => void;
  setShowMatching: React.Dispatch<React.SetStateAction<boolean>>;
}

function CloseFormButton({
  sendCancelReq = false,
  onClick,
  setShowMatching,
}: CloseButtonProps) {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (sendCancelReq) {
        const confirmed = confirm(
          'Are you sure you want to cancel your match request?',
        );
        if (confirmed) {
          const res = await deleteMatchRequest(getUserId()!.toString());
          if (!res.success) {
            const force = confirm(
              'Could not reach server to cancel match. Do you want to close anyway?',
            );
            if (!force) {
              return;
            } else {
              setShowMatching(false);
            }
          } else {
            alert(`${res.message}`);
          }
        }
      } else {
        onClick();
      }
    } catch (error) {
      alert(`Error cancelling match request: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title="Cancel Match Request">
      <button
        onClick={handleClick}
        className="absolute top-4 right-4 rounded-full bg-violet-100 p-2 hover:bg-violet-200 transition"
      >
        <XMarkIcon className="w-5 h-5 text-violet-500" />
      </button>
    </Tooltip>
  );
}

export default function MatchingPopUp({ setShowMatching }: MatchingPopUpProps) {
  const [matchState, setMatchState] = React.useState<MatchState>({
    status: 'matched',
    matchingId: '123',
  });
  const userId = getUserId();
  if (!userId) {
    console.error('User id not found');
  }

  // prevent window close or reload
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (matchState.status === 'waiting') {
        e.preventDefault();
        e.returnValue = '';

        const url = `${process.env.NEXT_PUBLIC_API_MATCHING}/match/cancel/${userId}`;

        navigator.sendBeacon(url);
      } else if (matchState.status === 'matched') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [matchState.status]);

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/10 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl shadow-violet-400 p-3 w-[70vw] h-[80vh] relative flex flex-col">
        {/* close button */}
        {matchState.status === 'requesting' ||
        matchState.status === 'timeout' ? (
          <CloseFormButton
            setShowMatching={setShowMatching}
            onClick={() => setShowMatching(false)}
          />
        ) : matchState.status === 'waiting' ? (
          <CloseFormButton
            sendCancelReq
            setShowMatching={setShowMatching}
            onClick={() => setShowMatching(false)}
          />
        ) : null}

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
          {matchState.status === 'requesting' && (
            <MatchingForm setMatchState={setMatchState} />
          )}
          {matchState.status === 'waiting' && (
            <LoadingView setMatchState={setMatchState} />
          )}
          {matchState.status === 'matched' && (
            <MatchedView
              matchingId={matchState.matchingId}
              onTimeout={() => setMatchState({ status: 'requesting' })}
            />
          )}
          {matchState.status === 'timeout' && <TimeoutView />}
        </div>
      </div>
    </div>
  );
}
