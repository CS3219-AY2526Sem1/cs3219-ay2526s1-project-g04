'use client';

import * as React from 'react';
import Image from 'next/image';

interface MatchedViewProps {
  matchingId: string;
  onTimeout: () => void;
}

export default function MatchedView({
  matchingId,
  onTimeout,
}: MatchedViewProps) {
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
