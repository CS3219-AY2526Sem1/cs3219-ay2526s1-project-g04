'use client'

import * as React from 'react';
import clsx from 'clsx';

interface ButtonProps {
  buttonText: string;
  customColor: string;
  active: boolean;
  onClick: () => void;
}

export default function TopicFilterButton({
  buttonText,
  customColor,
  active,
  onClick,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'py-1 px-4 rounded-full border',
        active ? 'text-white' : 'bg-transparent hover:opacity-80'
      )}
      style={{
        background: active ? customColor : 'transparent',
        borderColor: customColor.startsWith('#') ? customColor : '#2563EB',
        color: active ? 'white' : customColor.startsWith('#') ? customColor : '#2563EB',
      }}
    >
      {buttonText}
    </button>
  )
}
