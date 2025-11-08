'use client';

import * as React from 'react';
import TopicFilterButton from './TopicFilterButton';
import { Topic } from '@/lib/question-service/index';

interface TopicFilterBarProps {
  topics: Topic[];
  topicFilter: string;
  setTopicFilter: React.Dispatch<React.SetStateAction<string>>;
}

export default function TopicFilterBar({
  topics,
  topicFilter,
  setTopicFilter,
}: TopicFilterBarProps) {
  return (
    <div className="flex flex-row gap-3 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-track-transparent pb-2">
      <TopicFilterButton
        buttonText="All Topics"
        customColor="linear-gradient(90deg, #2563EB, #8B5CF6)"
        active={topicFilter === 'All Topics'}
        onClick={() => setTopicFilter('All Topics')}
      />
      {topics.map((topic) => (
        <TopicFilterButton
          key={topic.slug}
          buttonText={topic.display}
          customColor={topic.color_hex}
          active={topicFilter === topic.slug}
          onClick={() => setTopicFilter(topic.slug)}
        />
      ))}
    </div>
  );
}
