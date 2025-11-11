'use client';

import { useCodeContext } from './CodeContext';
import {
  Card,
  CardContent,
  CardHeader,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import '@/styles/globals.css';

export const TestCases = () => {
  const [value, setValue] = useState(0);
  const { testCases, results } = useCodeContext();

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Card
      className="flex flex-col h-full w-full shadow-2xl rounded-2xl"
      variant="outlined"
    >
      <CardHeader
        className="p-3 h-1/5"
        title={
          <Typography className="font-bold" variant="body1">
            Test Cases
          </Typography>
        }
      />
      <CardContent className="p-3 py-0 h-4/5 flex-1 overflow-y-auto">
        <Tabs
          value={value}
          onChange={handleChange}
          TabIndicatorProps={{ sx: { display: 'none' } }}
        >
          {testCases.map(
            (testCase, idx) =>
              testCase.visible === 'sample' && (
                <Tab
                  key={idx}
                  value={idx}
                  label={`Case ${idx + 1}`}
                  sx={{
                    textTransform: 'none',
                    minHeight: '32px',
                    height: '32px',
                    padding: '4px 12px',
                    '&.Mui-selected': {
                      backgroundColor: '#F3F4F6',
                      borderRadius: '10px',
                      color: 'black',
                    },
                  }}
                />
              ),
          )}
        </Tabs>

        {testCases.map((testCase, idx) =>
          value === idx && testCase.visible === 'sample' ? (
            <Stack key={idx} spacing={1} className="mt-2">
              <Typography variant="subtitle2">Input:</Typography>
              <Typography
                fontFamily="monospace"
                className="bg-gray-100 p-1 px-3 rounded-xl"
              >
                {testCase.input}
              </Typography>

              <Typography variant="subtitle2">Expected Output:</Typography>
              <Typography
                fontFamily="monospace"
                className="bg-gray-100 p-1 px-3 rounded-xl"
              >
                {testCase.expectedOutput}
              </Typography>

              <Typography variant="subtitle2">Actual Output:</Typography>
              <Typography
                fontFamily="monospace"
                className={`p-1 px-3 rounded-xl transition-colors duration-200 ${
                  results && results[idx] !== undefined
                    ? JSON.stringify(results[idx]).replace(/\s+/g, '') ===
                      testCase.expectedOutput.replace(/\s+/g, '')
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {results && results[idx] !== undefined
                  ? JSON.stringify(results[idx])
                  : '—'}
              </Typography>
            </Stack>
          ) : null,
        )}
      </CardContent>
    </Card>
  );
};
