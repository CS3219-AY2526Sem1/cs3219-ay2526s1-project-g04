'use client';

import {
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import { Topic } from '@/lib/question-service/index';

interface TopicSelectProps {
  topics: string[];
  setTopics: (value: string[]) => void;
  topicList: Topic[];
}

export default function TopicSelect({
  topics,
  setTopics,
  topicList,
}: TopicSelectProps) {
  const handleTopicChange = (event: SelectChangeEvent<typeof topics>) => {
    const {
      target: { value },
    } = event;
    setTopics(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <div className="flex flex-col">
      <FormControl fullWidth required>
        <label className="text-xl font-semibold text-[var(--foreground)] mb-3">
          Topics
        </label>

        <Select
          id="question-topics"
          multiple
          value={topics}
          className="rounded-md dark:bg-gray-800 dark:border-gray-700"
          onChange={handleTopicChange}
        >
          <MenuItem value="" disabled>
            Select topics
          </MenuItem>
          {topicList.map((topic) => (
            <MenuItem key={topic.slug} value={topic.slug}>
              <span
                className="py-1 px-3 rounded-full"
                style={{
                  border: `1px solid ${topic.color_hex}`,
                  color: `${topic.color_hex}`,
                }}
              >
                {topic.slug}
              </span>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}
