'use client';

import * as React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@mui/material';
import { deleteMatchRequest } from '@/services/matchingServiceApi';
import MatchingForm from './MatchingForm';

const TEST_USERID = 'test-user-id'; // change to apply logic

interface MatchingPopUpProps {
  setShowMatching: React.Dispatch<React.SetStateAction<boolean>>;
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>;
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
  const handleClick = async () => {
    try {
      if (sendCancelReq) {
        const confirmed = confirm(
          'Are you sure you want to cancel your match request?',
        );
        if (confirmed) {
          const res = await deleteMatchRequest(TEST_USERID);
          if (res.success) {
            setShowMatching(false);
          } else {
            alert(`${res.message}`);
          }
        }
      } else {
        onClick();
      }
    } catch (error) {
      alert(`Error cancelling match request: ${error}`);
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
  const [status, setStatus] = React.useState<
    'requesting' | 'waiting' | 'matched' | 'timeout'
  >('requesting');

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/10 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl shadow-violet-400 p-8 w-[70vw] h-[80vh] relative flex flex-col">
        {/* close button */}
        {status === 'requesting' || status === 'timeout' ? (
          <CloseFormButton
            setShowMatching={setShowMatching}
            onClick={() => setShowMatching(false)}
          />
        ) : status === 'waiting' ? (
          <CloseFormButton
            sendCancelReq
            setShowMatching={setShowMatching}
            onClick={() => setShowMatching(false)}
          />
        ) : null}

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
          {status === 'requesting' && <MatchingForm />}
        </div>
      </div>
    </div>
  );
}
