'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { getTopics } from '@/services/questionServiceApi';
import TopicFilterBar from '@/components/ui/home/question-bank/TopicFilterBar';
import AddQuestionButton from '@/components/ui/home/question-bank/AddQuestionButton';
import QuestionBankTable from '@/components/ui/home/question-bank/QuestionBankTable';
import { Topic } from '@/lib/question-service';

const USER_ROLE = 'admin'; // logic to be implemented after implementing user service

export default function Page() {
  const [topicFilter, setTopicFilter] = useState('All Topics'); // topic filter for table
  const [topicList, setTopicList] = useState<Topic[]>([]); // list of topics

  // get the list of topics from the question service
  useEffect(() => {
    getTopics()
      .then((data) => {
        const { items } = data;
        if (!items) return;

        // sort
        const sortedItems = items.sort((a: Topic, b: Topic) =>
          a.slug.toLowerCase().localeCompare(b.slug.toLowerCase()),
        );

        // console.log('Items:', sortedItems);
        setTopicList(sortedItems);
      })
      .catch((err) => console.error(err));
  }, []);

  // ui
  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex items-center justify-between">
        <h1>Question Bank</h1>
        {USER_ROLE === 'admin' && <AddQuestionButton />}
      </div>
      <TopicFilterBar
        topics={topicList}
        topicFilter={topicFilter}
        setTopicFilter={setTopicFilter}
      />
      <QuestionBankTable topicFilter={topicFilter} userRole={USER_ROLE} />
    </div>
  );
}
