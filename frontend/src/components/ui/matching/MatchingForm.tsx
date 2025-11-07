'use client';

import * as React from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { getTopicsByDifficulty } from '@/services/questionServiceApi';
import { Topic } from '@/lib/question-service/index';
import { DIFFICULTY_LEVELS } from '@/lib/constants/DifficultyLevels';
import { MatchCriteria, MatchRequestBody } from '@/lib/matching-service';
import { postMatchRequest } from '@/services/matchingServiceApi';
import { type MatchState } from '@/lib/constants/MatchTypes';
import { TEST_USER } from '@/lib/test-data/TestUser'; // for test
// import { TEST_TOPICS } from '@/lib/test-data/TestTopics'; // for test

interface FormProps {
  setMatchState: React.Dispatch<React.SetStateAction<MatchState>>;
}

interface DifficultySelectProps {
  difficulty: 'Easy' | 'Medium' | 'Hard';
  setDifficulty: React.Dispatch<
    React.SetStateAction<'Easy' | 'Medium' | 'Hard'>
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
  const allSelected =
    topics.length === topicList.length && topicList.length > 0;

  const toggleAllTopics = () => {
    setTopics(allSelected ? [] : topicList.map((t) => t.slug));
  };

  const toggleTopic = (topic: string) => {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  };

  return (
    <div className="flex flex-col gap-y-2">
      <label className="text-xl font-semibold text-[var(--foreground)]">
        Topics
      </label>

      <div className="flex justify-center items-center">
        <button
          onClick={toggleAllTopics}
          className="py-1 px-4 rounded-full border-1 border-violet-500 text-violet-500 hover:bg-violet-50"
        >
          Select All
        </button>
      </div>

      <div className="flex flex-wrap gap-3 justify-center items-center text-center w-[80%] mx-auto max-h-48 overflow-y-auto p-1">
        {topicList.map((topic) => {
          const isSelected = topics.includes(topic.slug);

          return (
            <button
              key={topic.slug}
              onClick={() => toggleTopic(topic.slug)}
              className="py-1 px-4 rounded-full border-1 transition-colors"
              style={{
                backgroundColor: isSelected ? topic.color_hex : 'transparent',
                borderColor: topic.color_hex,
                color: isSelected ? '#fff' : topic.color_hex,
              }}
            >
              {topic.display}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MatchingForm({ setMatchState }: FormProps) {
  // submission content
  const [difficulty, setDifficulty] = React.useState<
    'Easy' | 'Medium' | 'Hard'
  >('Easy');
  const [topics, setTopics] = React.useState<string[]>([]);

  // get topic list from question service
  const [topicList, setTopicList] = React.useState<Topic[]>([]);
  React.useEffect(() => {
    setTopics([]);

    getTopicsByDifficulty(difficulty)
      .then((res) => {
        if (!res.success) {
          alert(res.message);
          return;
        }

        const { items } = res.data;
        if (!items) return;

        // sort
        const sortedItems = items.sort((a: Topic, b: Topic) =>
          a.display.toLowerCase().localeCompare(b.display.toLowerCase()),
        );
        setTopicList(sortedItems);
      })
      .catch((err) => {
        alert(err);
      });
  }, [difficulty]);

  const [loading, setLoading] = React.useState(false);
  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    if (topics.length === 0) {
      return alert('Please select at least one topic.');
    }

    const reqCriteria: MatchCriteria = {
      difficulty,
      topics,
    };

    const reqPayload: MatchRequestBody = {
      userId: TEST_USER.userId,
      criteria: reqCriteria,
    };

    try {
      const res = await postMatchRequest(reqPayload);
      if (!res.success) {
        return alert(res.message);
      } else {
        return setMatchState({ status: 'waiting' });
      }
    } catch (error) {
      return alert(`Error submitting request: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center space-y-5 p-5">
      <h1 className="text-violet-500">Find your peer!</h1>
      <p className="w-[70%] text-gray-500">
        Choose the difficulty level and one or more topics you would like to
        practice. We will match you with someone suitable, so you can
        collaborate in real-time.
      </p>

      <DifficultySelect difficulty={difficulty} setDifficulty={setDifficulty} />
      <TopicSelect
        topics={topics}
        setTopics={setTopics}
        topicList={topicList}
        // topicList={TEST_TOPICS} // for testing
      />

      <button
        onClick={handleSubmit}
        className="flex items-center gap-1 underline text-violet-500 hover:text-violet-800"
      >
        Submit
        <ChevronRightIcon className="text-violet-500 w-5 h-5" />
      </button>
    </div>
  );
}
