'use client';

import * as React from 'react';
import {
  Autocomplete,
  FormControl,
  TextField
} from '@mui/material';
import { Topic } from '@/lib/question-service/index'
import CustomChip from './CustomChip'

interface TopicAutocompleteProps {
  topics: string[];
  setTopics: (value: string[]) => void;
  topicList: Topic[];
}

export default function TopicAutocomplete({
  topics,
  setTopics,
  topicList
}: TopicAutocompleteProps) {

  const handleTopicChange = (event: React.SyntheticEvent, newValue: string[]) => {
    setTopics(newValue);
  }

  const getTopicColor = (slug: string) => {
    const found = topicList.find((t) => t.slug === slug);
    return found ? found.color_hex : "#6B7280";
  }

  return (
    <FormControl fullWidth required>
      <label className="text-xl font-semibold text-[var(--foreground)] mb-3">
        Topics
      </label>

      <Autocomplete
        multiple
        id='question-topics'
        options={topicList.map((option) => option.slug)}
        value={topics}
        freeSolo
        renderValue={(value: readonly string[], getItemProps) =>
          value.map((option: string, index: number) => {
            const itemProps = getItemProps({ index });
            const color = getTopicColor(option);
            return (
              <CustomChip
                {...itemProps}
                key={option}
                label={option}
                colorHex={color}
              />
            )
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant='outlined'
            placeholder='Select topics or add new topic'
            className='rounded-md' // dark:bg-gray-800 dark:border-gray-700
          />
        )}
        onChange={handleTopicChange}
      />
    </FormControl>
  )
}