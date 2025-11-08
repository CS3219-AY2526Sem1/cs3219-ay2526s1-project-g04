'use client';

import * as React from 'react';
import { MenuItem, Select, Tooltip } from '@mui/material';
import { CheckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { MODES } from './TestCasesInput';
import { TestCase, TestCaseVisibility } from '@/lib/question-service';

const visibilityOptions: TestCaseVisibility[] = ['sample', 'hidden'];

interface props {
  mode: MODES;
  setMode: React.Dispatch<React.SetStateAction<MODES>>;
  testCases: TestCase[];
  setTestCases: React.Dispatch<React.SetStateAction<TestCase[]>>;
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
}

export default function EditingSection({
  mode,
  setMode,
  testCases,
  setTestCases,
  selectedIndex,
  setSelectedIndex,
}: props) {
  const [input, setInput] = React.useState('');
  const [output, setOutput] = React.useState('');
  const [visibility, setVisibility] =
    React.useState<TestCaseVisibility>('sample');

  React.useEffect(() => {
    if (mode === 'editing' && testCases[selectedIndex]) {
      const tc = testCases[selectedIndex];
      setInput(tc.input_data ?? '');
      setOutput(tc.expected_output ?? '');
      setVisibility(tc.visibility ?? 'sample');
    } else if (mode === 'creating') {
      setInput('');
      setOutput('');
      setVisibility('sample');
    }
  }, [mode, selectedIndex, testCases]);

  const handleAddNew = () => {
    // check
    if (input.trim() === '' || output.trim() === '') {
      alert('⚠️ Test case input and expected output should not be empty.');
      return;
    }

    const tc: TestCase = {
      visibility: visibility,
      input_data: input,
      expected_output: output,
    };

    // add the new test case to the list of existing test cases
    setTestCases((prev) => [...prev, tc]);

    // clear all previous entries
    setInput('');
    setOutput('');
    setVisibility('sample');

    // Ensure mode is correct
    setMode('creating');
  };

  const handleCancel = () => {
    setInput('');
    setOutput('');
    setVisibility('sample');

    // ensure mode is back to creating mode
    setMode('creating');
  };

  const handleSaveEdits = () => {
    if (input.trim() === '' || output.trim() === '') {
      alert('⚠️ Test case input and expected output should not be empty.');
      return;
    }

    const updatedTestCase: TestCase = {
      name: testCases[selectedIndex]?.name ?? undefined,
      visibility: visibility,
      input_data: input,
      expected_output: output,
      ordinal: testCases[selectedIndex]?.ordinal ?? undefined,
    };

    setTestCases((prev) =>
      prev.map((tc, i) => (i === selectedIndex ? updatedTestCase : tc)),
    );

    setInput('');
    setOutput('');
    setVisibility('sample');
    setMode('creating');
    setSelectedIndex(0);
  };

  return (
    <div className="flex flex-row items-end gap-x-6">
      {/* Input */}
      <div className="flex-1 flex flex-col gap-y-2">
        <p className="text-lg font-semibold">Input</p>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter test case input here"
          className="border border-gray-400 p-2 rounded h-12 w-full flex items-center hover:bg-blue-100 transition"
        />
      </div>

      {/* Expected Output */}
      <div className="flex-1 flex flex-col gap-y-2">
        <p className="text-lg font-semibold">Expected Output</p>
        <input
          type="text"
          value={output}
          onChange={(e) => setOutput(e.target.value)}
          placeholder="Enter test case expected output here"
          className="border border-gray-400 p-2 rounded h-12 w-full flex items-center hover:bg-blue-100 transition"
        />
      </div>

      {/* Visibility */}
      <div className="flex-1 flex flex-col gap-y-2">
        <p className="text-lg font-semibold">Visibility</p>
        <Select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          className="border border-gray-300 p-2 rounded h-12 w-full flex items-center hover:bg-blue-100"
        >
          {visibilityOptions.map((val) => (
            <MenuItem key={val} value={val}>
              {val}
            </MenuItem>
          ))}
        </Select>
      </div>

      {/* Actions */}
      {mode === 'creating' ? (
        <>
          <Tooltip title="Add new test case">
            <button
              type="button"
              onClick={() => handleAddNew()}
              className="w-12 h-12 flex items-center justify-center border border-gray-400 rounded-full group hover:bg-blue-100 transition"
            >
              <PlusIcon className="w-6 h-6 text-gray-500 group-hover:text-blue-500 transition" />
            </button>
          </Tooltip>

          <Tooltip title="Clear">
            <button
              type="button"
              onClick={() => handleCancel()}
              className="w-12 h-12 flex items-center justify-center border border-gray-400 rounded-full group hover:bg-red-100 transition"
            >
              <XMarkIcon className="w-6 h-6 text-gray-500 group-hover:text-red-500 transition" />
            </button>
          </Tooltip>
        </>
      ) : (
        <>
          <Tooltip title="Save edits">
            <button
              type="button"
              onClick={() => handleSaveEdits()}
              className="w-12 h-12 flex items-center justify-center border border-gray-400 rounded-full group hover:bg-green-100 transition"
            >
              <CheckIcon className="w-6 h-6 text-gray-500 group-hover:text-green-500 transition" />
            </button>
          </Tooltip>

          <Tooltip title="Cancel edit">
            <button
              type="button"
              onClick={() => handleCancel()}
              className="w-12 h-12 flex items-center justify-center border border-gray-400 rounded-full group hover:bg-red-100 transition"
            >
              <XMarkIcon className="w-6 h-6 text-gray-500 group-hover:text-red-500 transition" />
            </button>
          </Tooltip>
        </>
      )}
    </div>
  );
}
