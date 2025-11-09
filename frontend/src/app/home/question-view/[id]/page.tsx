'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  getAdminQuestionById,
  getQuestionById,
  getAdminQuestionsResources,
  getQuestionsResources,
} from '@/services/questionServiceApi';
import { Question, TestCase } from '@/lib/question-service';
import QuestionViewBox from '@/components/ui/home/question-view/QuestionViewBox';
import TestCaseBox from '@/components/ui/home/question-view/TestCaseBox';
// import { TEST_QUESTION_VIEW } from '@/lib/test-data/TestQuestionView'; // for test
// import { TEST_TEST_CASES } from '@/lib/test-data/TestTestCases'; // for test
import { TEST_USER } from '@/lib/test-data/TestUser'; // for test

export default function QuestionViewPage() {
  const params = useParams();
  const questionId = params.id;
  const [questionData, setQuestionData] = useState<Question | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);

  // get question details
  useEffect(() => {
    if (!questionId) return;

    setLoading(true);
    if (TEST_USER.role === 'admin') {
      getAdminQuestionById(questionId.toString())
        .then((res) => {
          if (!res.success) {
            alert(`⚠️ Error: ${res.message}`);
            return;
          }

          setQuestionData(res.data);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else if (TEST_USER.role === 'user') {
      getQuestionById(questionId.toString())
        .then((res) => {
          if (!res.success) {
            alert(`⚠️ Error: ${res.message}`);
            return;
          }

          setQuestionData(res.data);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [questionId]);

  // get test cases
  useEffect(() => {
    if (!questionId) return;

    setLoading(true);
    if (TEST_USER.role === 'admin') {
      getAdminQuestionsResources(questionId.toString())
        .then((res) => {
          if (!res.success) {
            alert(`⚠️ Error: ${res.message}`);
            return;
          }

          setTestCases(res.data.test_cases ?? []);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else if (TEST_USER.role === 'user') {
      getQuestionsResources(questionId.toString())
        .then((res) => {
          if (!res.success) {
            alert(`⚠️ Error: ${res.message}`);
            return;
          }
          setTestCases(res.data.test_cases ?? []);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [questionId]);

  // const questionData = TEST_QUESTION_VIEW; // for test
  // const testCases = TEST_TEST_CASES; // for test

  return (
    <div>
      {questionData ? (
        loading ? (
          <p>Loading...</p>
        ) : (
          <div className="flex flex-col flex-1 gap-6">
            <QuestionViewBox
              questionData={questionData}
              userRole={TEST_USER.role}
            />
            <TestCaseBox testCases={testCases} />
          </div>
        )
      ) : (
        <div className="flex flex-col gap-y-6">
          <h1>Question View Page</h1>
          <p>No question found.</p>
        </div>
      )}
    </div>
  );
}
