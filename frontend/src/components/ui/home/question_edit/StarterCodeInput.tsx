'use client';

import * as React from 'react';

interface StarterCodeInputProps {
  starterCode: string;
  setStarterCode: React.Dispatch<React.SetStateAction<string>>;
  entryPoint: string;
  setEntryPoint: React.Dispatch<React.SetStateAction<string>>;
}

export default function StarterCodeInput({
  starterCode,
  setStarterCode,
  entryPoint,
  setEntryPoint,
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
        placeholder={`# Input the starter code in Python here\n# This is an example\n\nclass Solution:\n  def solve(self, arr):\n\t#TODO: implement your logic here\n\tpass`}
        className="flex h-50 rounded-md bg-gray-900 font-mono text-white text-sm p-2 resize-none outline-none overflow-y-auto scrollbar-auto"
      />

      <div className="h-4" />

      {/* Entry point */}
      <div className="flex flex-col">
        <label
          htmlFor="entry_point"
          className="text-xl font-semibold text-[var(--foreground)]"
        >
          Entry Point
        </label>

        <p className="text-gray-500 mb-3">
          Specify entry point to starter code below.
        </p>

        <input
          type="text"
          name="entry_point"
          value={entryPoint}
          onChange={(e) => setEntryPoint(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          placeholder="Enter entry point to starter code e.g. Solution.solve"
          className="border border-gray-400 rounded p-4 font-mono hover:bg-blue-100"
        />
      </div>
    </div>
  );
}
