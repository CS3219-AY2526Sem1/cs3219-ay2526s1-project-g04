'use client';

import * as React from 'react';
import SearchBar from '@/components/ui/home/question-search/SearchBar';
import QuestionDisplayCard from '@/components/ui/home/question-search/QuestionDisplayCard';
import { getRole } from '@/lib/utils/jwt';
import {
  getAdminQuestionsRequestParams,
  getQuestionsRequestParams,
  Question,
} from '@/lib/question-service';
import { getAdminQuestions, getQuestions } from '@/services/questionServiceApi';
import { TEST_QUESTION_LIST } from '@/lib/test-data/TestQuestionList';

export default function QuestionSearchPage() {
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [questionsList, setQuestionsList] = React.useState<Question[]>([]);

  // get the role of user
  React.useEffect(() => {
    const role = getRole();
    // console.log(`User role: ${role}`);
    setUserRole(role);
  }, []);

  // on load show first 10 questions first
  React.useEffect(() => {
    if (!userRole) return;

    const fetchQuestions = async () => {
      try {
        if (userRole === 'ADMIN') {
          const payload: getAdminQuestionsRequestParams = {
            page: 1,
            page_size: 10,
          };
          const res = await getAdminQuestions(payload);

          if (!res.success) {
            alert(`Error: ${res.message}`);
            return;
          }

          const { items } = res.data;
          setQuestionsList(items);
        }
        if (userRole === 'USER') {
          const payload: getQuestionsRequestParams = {
            page: 1,
            page_size: 10,
          };
          const res = await getQuestions(payload);

          if (!res.success) {
            alert(`Error: ${res.message}`);
            return;
          }

          const { items } = res.data;
          setQuestionsList(items);
        }
      } catch (error) {
        console.error(`Error: ${error}`);
        return;
      }
    };

    fetchQuestions();
  }, [userRole]);

  if (!userRole) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center">
        <p className="text-gray-500">Please log in to view this page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-y-5">
      <h1>Question Search</h1>

      <SearchBar userRole={userRole} setQuestionsList={setQuestionsList} />

      <div className="mt=3"></div>
      <p className="text-gray-500">Search results:</p>

      <div className="flex flex-col gap-y-2 overflow-y-auto">
        {questionsList.map((question) => (
          <QuestionDisplayCard
            key={question.id}
            userRole={userRole}
            question={question}
          />
        ))}
      </div>
    </div>
  );
}
