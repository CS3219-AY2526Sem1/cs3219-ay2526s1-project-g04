'use client';

import * as React from 'react';
import { Topic } from '@/lib/question-service';
import { getTopics } from '@/services/questionServiceApi';
import TopicSelection from './TopicSelection';
import TopicCreation from './TopicCreation';

interface props {
  selectedTopicSlugs: string[];
  setSelectedTopicSlugs: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function TopicInputSection({
  selectedTopicSlugs,
  setSelectedTopicSlugs,
}: props) {
  const [registeredTopics, setRegisteredTopics] = React.useState<Topic[]>([]); // list of topics (slug, display, hex) in the question service

  // get list of topics available from question service
  React.useEffect(() => {
    getTopics()
      .then((res) => {
        if (!res.success) {
          alert(`⚠️ Error getting topic list: ${res.message}`);
          return;
        }
        const { items } = res.data;
        if (!items) return;

        // sort
        const sortedItems = items.sort((a: Topic, b: Topic) =>
          a.slug.toLowerCase().localeCompare(b.slug.toLocaleLowerCase()),
        );
        setRegisteredTopics(sortedItems);
      })
      .catch((error) => console.error(error));
  }, []);

  return (
    <div className="flex flex-col w-full gap-y-3">
      <label className="text-xl font-semibold text-[var(--foreground)]">
        Topics
      </label>

      <TopicSelection
        selectedTopicSlugs={selectedTopicSlugs}
        setSelectedTopicSlugs={setSelectedTopicSlugs}
        registeredTopics={registeredTopics}
      />

      <TopicCreation
        registeredTopics={registeredTopics}
        setRegisteredTopics={setRegisteredTopics}
        setSelectedTopicSlugs={setSelectedTopicSlugs}
      />
    </div>
  );
}
