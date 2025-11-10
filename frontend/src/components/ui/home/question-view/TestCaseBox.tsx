'use client';

import * as React from 'react';
import { TestCase } from '@/lib/question-service';

interface TestCaseBoxProps {
  testCases: TestCase[];
}

export default function TestCaseBox({ testCases }: TestCaseBoxProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const selectedTestCase = testCases[selectedIndex] || null;

  return (
    <div className="flex flex-col gap-y-3 bg-white w-full h-[28rem] rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.2)] p-5">
      <p className="text-xl font-bold text-[var(--foreground)]">Test Cases</p>

      {/* Tabs */}
      <div className="flex flex-row gap-2 overflow-x-auto">
        {testCases.map((tc, index) => (
          <button
            key={tc.name || index}
            onClick={() => setSelectedIndex(index)}
            className={`px-4 py-2 rounded-md font-semibold text-lg whitespace-nowrap  transition
              ${selectedIndex === index ? 'bg-gray-200 text-black' : 'text-gray-500 hover:text-blue-500'}
            `}
          >
            {`Case ${index}`}
          </button>
        ))}
      </div>

      {/* Selected Test Case */}
      <div className="flex-1 overflow-y-auto scrollbar-auto">
        {selectedTestCase ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-row gap-2">
              <p className="font-bold">Visibility:</p>
              <p>{selectedTestCase.visibility ?? 'N/A'}</p>
            </div>

            <p className="font-bold">Input:</p>
            <pre>{selectedTestCase.input_data}</pre>

            <p className="font-bold">Expected Output:</p>
            <pre>{selectedTestCase.expected_output}</pre>
          </div>
        ) : (
          <div className="flex w-full h-full justify-center items-center">
            <p className="text-gray-500">No test cases available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
