'use client';

import React, { createContext, useContext } from 'react';

interface TestCase {
  input: (number | string | boolean | object)[];
  expectedOutput: string;
}

interface ExecutionResult {
  output: string;
  passed: boolean;
  error?: string;
}

interface CodeContextType {
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  language: string;
  setLanguage: React.Dispatch<React.SetStateAction<string>>;
  testCases: TestCase[];
  results: ExecutionResult[];
  setResults: React.Dispatch<React.SetStateAction<ExecutionResult[]>>;
  sessionId: string | undefined;
  setSessionId: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const CodeContext = createContext<CodeContextType | undefined>(undefined);

export function CodeProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = React.useState<string>(
    '// Collaborative Monaco with Yjs',
  );
  const [language, setLanguage] = React.useState<string>('python');
  const [results, setResults] = React.useState<ExecutionResult[]>([]);
  const [sessionId, setSessionId] = React.useState<string>();
  const testCases: TestCase[] = [
    { input: [[2, 7, 11, 15], 9], expectedOutput: '[0, 1]' },
    { input: [[3, 2, 4], 6], expectedOutput: '[1, 2]' },
    { input: [[3, 3], 6], expectedOutput: '[0, 1]' },
    { input: [[1, 5, 3, 7], 8], expectedOutput: '[1, 2]' },
    { input: [[10, 20, 30, 40, 50], 90], expectedOutput: '[3, 4]' },
  ];

  return (
    <CodeContext.Provider
      value={{
        code,
        setCode,
        language,
        setLanguage,
        testCases,
        results,
        setResults,
        sessionId,
        setSessionId,
      }}
    >
      {children}
    </CodeContext.Provider>
  );
}

export function useCodeContext() {
  const context = useContext(CodeContext);
  if (!context) {
    throw new Error('useCodeContext must be used within a CodeProvider');
  }
  return context;
}
