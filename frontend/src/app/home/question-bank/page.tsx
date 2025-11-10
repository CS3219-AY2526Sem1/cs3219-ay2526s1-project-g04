'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { getTopics } from '@/services/questionServiceApi';
import TopicFilterBar from '@/components/ui/home/question-bank/TopicFilterBar';
import AddQuestionButton from '@/components/ui/home/question-bank/AddQuestionButton';
import QuestionBankTable from '@/components/ui/home/question-bank/QuestionBankTable';
import { Topic } from '@/lib/question-service';
import { getRole } from '@/lib/utils/jwt';
// import { TEST_TOPICS } from '@/lib/test-data/TestTopics'; // for test
// import { TEST_USER } from '@/lib/test-data/TestUser'; // for test

export default function Page() {
  const [topicFilter, setTopicFilter] = useState('All Topics'); // topic filter for table
  const [topicList, setTopicList] = useState<Topic[]>([]); // list of topics
  const [userRole, setUserRole] = useState<string | null>(null);

  // get the role of user
  useEffect(() => {
    const role = getRole();
    setUserRole(role);
  }, []);

  // get the list of topics from the question service
  useEffect(() => {
    getTopics()
      .then((res) => {
        if (!res.success) {
          alert(`⚠️ Error: ${res.message}`);
          return;
        }
        const { items } = res.data;
        if (!items) return;

        // sort
        const sortedItems = items.sort((a: Topic, b: Topic) =>
          a.display.toLowerCase().localeCompare(b.display.toLowerCase()),
        );

        // console.log('Items:', sortedItems);
        setTopicList(sortedItems);
      })
      .catch((err) => console.error(err));
  }, []);

  if (!userRole) {
    return (
      <div className="flex justify-center items-center h-full w-full">
        <p className="text-gray-500">
          You must be logged in to view this page.
        </p>
      </div>
    );
  }

  // ui
  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex items-center justify-between">
        <h1>Question Bank</h1>
        {userRole === 'ADMIN' && <AddQuestionButton />}
      </div>

      <TopicFilterBar
        topics={topicList}
        // topics={TEST_TOPICS} // for test
        topicFilter={topicFilter}
        setTopicFilter={setTopicFilter}
      />
      <QuestionBankTable topicFilter={topicFilter} userRole={userRole} />
    </div>
  );
}
