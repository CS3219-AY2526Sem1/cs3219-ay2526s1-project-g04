'use client';

import * as React from 'react';
import { TestCase } from '@/lib/question-service';
import EditingSection from './EditingSection';
import DisplayBox from './DisplayBox';

export type MODES = 'creating' | 'editing';

interface props {
  testCases: TestCase[];
  setTestCases: React.Dispatch<React.SetStateAction<TestCase[]>>;
}

export default function TestCasesInput({ testCases, setTestCases }: props) {
  const [mode, setMode] = React.useState<MODES>('editing');
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  return (
    <div className="flex flex-col gap-y-3">
      <div>
        <label className="text-xl font-semibold text-[var(--foreground)]">
          Test Cases
        </label>
        <p className="text-gray-500 mt-2">
          {mode === 'creating' ? (
            <span className="py-1 px-2 rounded-full border border-violet-500 text-violet-500 text-sm">
              Create
            </span>
          ) : (
            <span className="py-1 px-2 rounded-full border border-blue-500 text-blue-500 text-sm">
              Edit
            </span>
          )}
        </p>
      </div>

      <EditingSection
        mode={mode}
        setMode={setMode}
        testCases={testCases}
        setTestCases={setTestCases}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
      />

      <DisplayBox
        mode={mode}
        setMode={setMode}
        testCases={testCases}
        setTestCases={setTestCases}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
      />
    </div>
  );
}
