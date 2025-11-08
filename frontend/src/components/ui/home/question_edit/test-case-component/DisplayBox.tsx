'use client';

import * as React from 'react';
import { TestCase } from '@/lib/question-service';
import { MODES } from './TestCasesInput';
import { Tooltip } from '@mui/material';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface props {
  mode: MODES;
  setMode: React.Dispatch<React.SetStateAction<MODES>>;
  testCases: TestCase[];
  setTestCases: React.Dispatch<React.SetStateAction<TestCase[]>>;
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
}

export default function DisplayBox({
  mode,
  setMode,
  testCases,
  setTestCases,
  selectedIndex,
  setSelectedIndex,
}: props) {
  const selectedTestCase = testCases[selectedIndex] ?? undefined;

  const handleEdit = () => {
    setMode('editing');
  };

  const handleDelete = () => {
    setTestCases((prev) => prev.filter((_, i) => i !== selectedIndex));
    setSelectedIndex(0);
    setMode('creating');
  };

  return (
    <div className="flex flex-col gap-y-3 w-full h-[26rem] rounded p-5 border border-gray-400">
      {testCases.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-gray-500">No test cases added.</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex flex-row gap-2 overflow-x-auto">
            {testCases.map((tc, idx) => (
              <button
                type="button"
                key={tc.name || idx}
                onClick={() => setSelectedIndex(idx)}
                disabled={mode === 'editing'}
                className={`px-4 py-2 rounded-md font-semibold text-lg whitespace-nowrap transition
                  ${selectedIndex === idx ? 'bg-gray-200 text-black' : 'text-gray-500 hover:text-blue-500'}
                `}
              >
                {`Case ${idx + 1}`}
              </button>
            ))}
          </div>

          {/* Test Case Displaying */}
          <div className="flex-1 overflow-y-auto scrollbar-auto">
            <div className="flex flex-col gap-2">
              <div className="flex flex-row gap-2">
                <p className="font-bold">Visibility:</p>
                <p>{selectedTestCase.visibility ?? 'N/A'}</p>
              </div>
            </div>

            <p className="font-bold mb-1">Input:</p>
            <pre>{selectedTestCase.input_data}</pre>

            <p className="font-bold mb-1">Expected Output:</p>
            <pre>{selectedTestCase.expected_output}</pre>
          </div>

          {/* Action Buttons */}
          <div className="flex">
            <div className="flex-1" />

            <Tooltip title="Edit this test case">
              <button
                type="button"
                onClick={() => handleEdit()}
                disabled={mode === 'editing'}
                className="p-2 rounded-full group hover:bg-blue-100 transition"
              >
                <PencilIcon className="w-6 h-6 text-gray-500 group-hover:text-blue-500 transition" />
              </button>
            </Tooltip>

            <Tooltip title="Delete this test case">
              <button
                type="button"
                onClick={() => handleDelete()}
                disabled={mode === 'editing'}
                className="p-2 rounded-full group hover:bg-red-100 transition"
              >
                <TrashIcon className="w-6 h-6 text-gray-500 group-hover:text-red-500 transition" />
              </button>
            </Tooltip>
          </div>
        </>
      )}
    </div>
  );
}
