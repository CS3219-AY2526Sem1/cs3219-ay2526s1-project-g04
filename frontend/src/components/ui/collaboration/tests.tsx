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
import React, { useEffect, useState } from 'react';
import '@/styles/globals.css';
import { sessionCodeIsPassed } from '@/services/collaborationServiceApi';
import { getUserId } from '@/lib/utils/jwt';
import { getCollabProvider } from './collabSingleton';

export const TestCases = () => {
  const [value, setValue] = useState(0);
  const { testCases, results, sessionId } = useCodeContext();

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const hiddenFailed = () => {
    const failed = testCases.some((testCase, idx) => {
      if (results && results[idx]) {
        if (
          JSON.stringify(results[idx]).replace(/\s+/g, '') !==
            testCase.expectedOutput.replace(/\s+/g, '') &&
          testCase.visible === 'hidden'
        ) {
          console.log('hidden failed');
          return true;
        }
      }
    });
    return failed === true;
  };

  const hiddenPassed = () => {
    if (results) {
      let passedCount = 0;
      let totalHc = 0;
      for (let i = 0; i < testCases.length; i++) {
        if (
          results[i] &&
          JSON.stringify(results[i]).replace(/\s+/g, '') ===
            testCases[i].expectedOutput.replace(/\s+/g, '')
        ) {
          passedCount++;
        }
        totalHc++;
      }
      if (passedCount > 0 && totalHc > 0 && passedCount === totalHc) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    // Check if results exist and the hidden tests have passed
    if (hiddenPassed()) {
      const handleHiddenPass = async () => {
        if (!hiddenPassed()) return;

        console.log('All Hidden Tests Passed! Initiating fetch...');
        try {
          if (sessionId) {
            sessionCodeIsPassed(sessionId);
            const providers = getCollabProvider(
              sessionId,
              getUserId()!.toString(),
            );
            if (providers && providers.yCodeDoc) {
              console.log('SENDING MESSAGE');
              const yNotifications = providers.yCodeDoc.getMap('notifications');
              const messagePayload = {
                senderId: getUserId(),
                message:
                  'your coding buddy has submitted the code, all test cases passed!',
                timestamp: Date.now(),
              };
              yNotifications.set(Date.now().toString(), messagePayload);
            }
          }
        } catch (error) {
          console.error('Error submitting code solved', error);
        }
      };
      handleHiddenPass();
    }
  }, [hiddenPassed()]);

  return (
    <Card
      className="flex flex-col h-full w-full shadow-2xl rounded-2xl"
      variant="outlined"
    >
      <CardHeader
        className="p-3 h-1/5"
        title={
          <Stack direction={'row'} spacing={2}>
            <Typography className="font-bold" variant="body1">
              Test Cases
            </Typography>
            {hiddenFailed() && (
              <Typography className="text-red-500 font-bold">
                Hidden Test Cases failed
              </Typography>
            )}
            {results &&
              results.length === testCases.length &&
              hiddenPassed() && (
                <Typography className="text-green-500 font-bold">
                  Hidden Test Cases Passed
                </Typography>
              )}
          </Stack>
        }
      />
      <CardContent className="p-3 py h-4/5 flex-1 overflow-y-auto">
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
