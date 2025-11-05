'use client';

import * as React from 'react';

export default function TimeoutView() {
  return (
    <div className="flex flex-col items-center text-center space-y-5 w-full">
      <h1 className="text-violet-500">
        We could not find you a peer right now :(
      </h1>
      <p className="text-gray-500">
        Try again in a few minutes, or adjust your difficulty/topic filters and
        try again.
      </p>
    </div>
  );
}
