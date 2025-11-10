'use client';

import * as React from 'react';
import { MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { Topic } from '@/lib/question-service';
import TopicChip from './TopicChip';

interface props {
  selectedTopicSlugs: string[];
  setSelectedTopicSlugs: React.Dispatch<React.SetStateAction<string[]>>;
  registeredTopics: Topic[];
}

export default function TopicSelection({
  selectedTopicSlugs,
  setSelectedTopicSlugs,
  registeredTopics,
}: props) {
  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    setSelectedTopicSlugs(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <div>
      <Select
        multiple
        value={selectedTopicSlugs}
        onChange={handleChange}
        className="w-full h-14 rounded-md items-center"
        renderValue={(selected) => {
          const selectedTopics = registeredTopics.filter((t) =>
            selected.includes(t.slug),
          );

          return (
            <div
              className="flex flex-row w-full gap-x-2 overflow-x-auto scrollbar-auto"
              style={{
                marginLeft: -20,
              }}
            >
              {selectedTopics.map((topic) => {
                return <TopicChip key={topic.slug} topic={topic} />;
              })}
            </div>
          );
        }}
      >
        {registeredTopics.map((topic) => {
          const slug = topic.slug;
          const displayName = topic.display;

          return (
            <MenuItem key={slug} value={slug}>
              {displayName}
            </MenuItem>
          );
        })}
      </Select>
    </div>
  );
}
