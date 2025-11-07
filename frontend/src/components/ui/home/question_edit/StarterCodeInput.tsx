'use client';

import * as React from 'react';

interface StarterCodeInputProps {
  starterCode: string;
  setStarterCode: React.Dispatch<React.SetStateAction<string>>;
}

export default function StarterCodeInput({
  starterCode,
  setStarterCode,
}: StarterCodeInputProps) {
  // for tab key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue =
        starterCode.substring(0, start) + '\t' + starterCode.substring(end);
      setStarterCode(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    }
  };

  return (
    <div className="flex flex-col">
      <label
        htmlFor="starter_code"
        className="text-xl font-semibold text-[var(--foreground)]"
      >
        Starter Code
      </label>

      <p className="text-gray-500 mb-3">Write starter code in Python.</p>

      <textarea
        id="starter_code"
        name="starter_code"
        value={starterCode}
        onChange={(e) => setStarterCode(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`# Write your Python starter code here...`}
        className="flex h-50 rounded-md bg-gray-900 font-mono text-white text-sm p-2 resize-none outline-none overflow-y-auto scrollbar-auto"
      />
    </div>
  );
}
