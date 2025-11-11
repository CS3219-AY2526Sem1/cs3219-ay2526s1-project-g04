'use client';

import { Question } from '@/lib/question-service';
import { getQuestionIdBySessId } from '@/services/collaborationServiceApi';
import { getQuestionById } from '@/services/questionServiceApi';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface TestCase {
  input: string;
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
  const [testCases, setTestCases] = useState<TestCase[]>([]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    const fetchQuestion = async () => {
      const questionId: string | null = await getQuestionIdBySessId(sessionId);
      console.log(1, questionId);

      if (!questionId) return;

      const res = await getQuestionById(questionId);
      if (!res.success) {
        alert(`⚠️ Error fetching question: ${res.message}`);
        return;
      }

      const question: Question = res.data;
      console.log(question);
      console.log(question.starter_code);
      const quesTestCases = question.test_cases;
      const quesStarterCode = question.starter_code;
      const testCases = quesTestCases?.map((testcase, idx) => {
        return {
          input: testcase.input_data,
          expectedOutput: testcase.expected_output,
        };
      });
      if (testCases) {
        setTestCases(testCases);
      }
      if (quesStarterCode) {
        setCode(quesStarterCode);
      }

      console.log('tc', quesTestCases);
    };
    fetchQuestion();
  }, [sessionId]);

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
