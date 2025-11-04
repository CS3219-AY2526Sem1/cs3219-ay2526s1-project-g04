'use client';

import * as React from 'react';
import { getTopics } from '@/services/questionServiceApi';
import { Topic } from '@/lib/question-service/index';
import { DIFFICULTY_LEVELS } from '@/lib/constants/difficultyLevels';

interface DifficultySelectProps {
  difficulty: 'Easy' | 'Medium' | 'Hard' | null;
  setDifficulty: React.Dispatch<
    React.SetStateAction<'Easy' | 'Medium' | 'Hard' | null>
  >;
}

interface TopicsSelectProps {
  topics: string[];
  setTopics: React.Dispatch<React.SetStateAction<string[]>>;
  topicList: Topic[];
}

function DifficultySelect({
  difficulty,
  setDifficulty,
}: DifficultySelectProps) {
  return (
    <div className="flex flex-col">
      <label className="text-xl font-semibold text-[var(--foreground)] mb-2">
        Difficulty
      </label>

      <div className="flex flex-row gap-4">
        {DIFFICULTY_LEVELS.map((level) => {
          const { name, color_hex } = level;
          const isSelected = difficulty === name;

          return (
            <button
              key={name}
              onClick={() => setDifficulty(name)}
              className="py-1 px-4 rounded-full border-1 transition-colors"
              style={{
                backgroundColor: isSelected ? color_hex : 'transparent',
                borderColor: color_hex,
                color: isSelected ? '#fff' : color_hex,
              }}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TopicSelect({ topics, setTopics, topicList }: TopicsSelectProps) {
  return (
    <div className="flex flex-col">
      <label className="text-xl font-semibold text-[var(--foreground)] mb-2">
        Topics
      </label>
    </div>
  );
}

export default function MatchingForm() {
  // submission content
  const [difficulty, setDifficulty] = React.useState<
    'Easy' | 'Medium' | 'Hard' | null
  >(null);
  const [topics, setTopics] = React.useState<string[]>([]);

  // get topic list from question service
  const [topicList, setTopicList] = React.useState<Topic[]>([]);
  React.useEffect(() => {
    getTopics()
      .then((data) => {
        const { items } = data;
        if (!items) return;

        // sort
        const sortedItems = items.sort((a: Topic, b: Topic) =>
          a.slug.toLowerCase().localeCompare(b.slug.toLowerCase()),
        );
        setTopicList(sortedItems);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="flex flex-col items-center text-center space-y-5 p-5">
      <h1 className="text-violet-500">Find your peer!</h1>
      <p className="w-[70%] text-gray-500">
        Choose the difficulty level and one or more topics you wouldd like to
        practice. We will match you with someone suitable, so you can
        collaborate in real-time.
      </p>

      <DifficultySelect difficulty={difficulty} setDifficulty={setDifficulty} />
      <TopicSelect
        topics={topics}
        setTopics={setTopics}
        topicList={topicList}
      />
    </div>
  );
}
