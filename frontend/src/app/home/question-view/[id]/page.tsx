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
import { getRole } from '@/lib/utils/jwt';
// import { TEST_QUESTION_VIEW } from '@/lib/test-data/TestQuestionView'; // for test
// import { TEST_TEST_CASES } from '@/lib/test-data/TestTestCases'; // for test
// import { TEST_USER } from '@/lib/test-data/TestUser'; // for test

export default function QuestionViewPage() {
  const params = useParams();
  const questionId = params.id;
  const [questionData, setQuestionData] = useState<Question | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // get the role of user
  useEffect(() => {
    const role = getRole();
    setUserRole(role);
  }, []);

  // get question details
  useEffect(() => {
    if (!questionId) return;

    setLoading(true);
    if (userRole === 'ADMIN') {
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
    } else if (userRole === 'USER') {
      getQuestionById(questionId.toString())
        .then((res) => {
          if (!res.success) {
            alert(`⚠️ Error: ${res.message}`);
            return;
          }

          // console.log(`got question successfully: ${JSON.stringify(res.data)}`);
          setQuestionData(res.data);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [questionId, userRole]);

  // get test cases
  useEffect(() => {
    if (!questionId) return;

    setLoading(true);
    if (userRole === 'ADMIN') {
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
    } else if (userRole === 'USER') {
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
  }, [questionId, userRole]);

  // const questionData = TEST_QUESTION_VIEW; // for test
  // const testCases = TEST_TEST_CASES; // for test

  if (!userRole) {
    return (
      <div className="flex justify-center items-center h-full w-full">
        <p className="text-gray-500">
          You must be logged in to view this page.
        </p>
      </div>
    );
  }

  return (
    <div>
      {questionData ? (
        loading ? (
          <p>Loading...</p>
        ) : (
          <div className="flex flex-col flex-1 gap-6">
            <QuestionViewBox questionData={questionData} userRole={userRole} />
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
