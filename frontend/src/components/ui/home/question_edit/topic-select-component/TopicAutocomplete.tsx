'use client';

import * as React from 'react';
import { Autocomplete, FormControl, TextField } from '@mui/material';
import { Topic, postTopicRequest } from '@/lib/question-service/index';
import { TOPIC_COLORS } from '@/lib/constants/TopicColors';
import { getTopics, postAdminTopics } from '@/services/questionServiceApi';
import CustomChip from './CustomChip';
// import { TEST_TOPICS } from '@/lib/test-data/TestTopics';

interface TopicAutocompleteProps {
  topics: string[];
  setTopics: React.Dispatch<React.SetStateAction<string[]>>;
}

function getRandomColor() {
  if (TOPIC_COLORS.length === 0) {
    return '#FF383C';
  }
  const randomIdx = Math.floor(Math.random() * TOPIC_COLORS.length);
  return TOPIC_COLORS[randomIdx];
}

export default function TopicAutocomplete({
  topics,
  setTopics,
}: TopicAutocompleteProps) {
  // get list of topics (slug, display, color_hex)
  const [topicList, setTopicList] = React.useState<Topic[]>([]);
  const [creatingTopics, setCreatingTopics] = React.useState<string[]>([]);

  React.useEffect(() => {
    getTopics()
      .then((res) => {
        if (!res.success) {
          alert(res.message);
          return;
        }
        const { items } = res.data;
        if (!items) return;

        // sort
        const sortedItems = items.sort((a: Topic, b: Topic) =>
          a.slug.toLowerCase().localeCompare(b.slug.toLowerCase()),
        );
        setTopicList(sortedItems);
      })
      .catch((error) => console.error(error));
  }, []);

  const getTopicColor = (slug: string) => {
    const found = topicList.find((t) => t.slug === slug);
    if (found) {
      return found.color_hex;
    } else {
      return '#6B7280';
    }
  };

  const selectedTopics = topics.map((slug) => {
    const existingTopic = topicList.find((t) => t.slug === slug);

    if (existingTopic) {
      return existingTopic;
    }

    return slug;
  });

  // handle topic creation
  React.useEffect(() => {
    const newTopicStrings = topics.filter(
      (slug) =>
        typeof slug === 'string' &&
        !topicList.find((t) => t.slug === slug) &&
        !creatingTopics.includes(slug),
    );

    if (newTopicStrings.length > 0) {
      newTopicStrings.forEach((displayName) => {
        setCreatingTopics((prev) => [...prev, displayName]);

        const newColor = getRandomColor();

        const payload: postTopicRequest = {
          display: displayName,
          color_hex: newColor,
        };

        postAdminTopics(payload)
          .then((res) => {
            if (!res.success) {
              alert(`Failed to create topic ${displayName}: ${res.message}`);
              setTopics((prevTopics) =>
                prevTopics.filter((p) => p !== displayName),
              );
              return;
            }
            const newTopic: Topic = res.data;
            const { slug } = newTopic;

            setTopics((prevTopics) =>
              prevTopics.map((p) => (p === displayName ? slug : p)),
            );

            setTopicList((prev) => [...prev, newTopic]);
          })
          .finally(() => {
            setCreatingTopics((prev) => prev.filter((p) => p !== displayName));
          });
      });
    }
  }, [topics]);

  return (
    <FormControl fullWidth required>
      <label className="text-xl font-semibold text-[var(--foreground)] mb-3">
        Topics
      </label>

      <Autocomplete
        multiple
        id="question-topics"
        options={topicList}
        getOptionLabel={(option) =>
          typeof option === 'string' ? option : option.display
        }
        value={selectedTopics}
        freeSolo
        renderValue={(
          selectedValues: readonly (string | Topic)[],
          getItemProps,
        ) => {
          return selectedValues.map((option: string | Topic, index: number) => {
            const { key, ...itemProps } = getItemProps({ index });
            let label: string;
            let slug: string;
            if (typeof option === 'string') {
              label = option;
              slug = option;

              if (creatingTopics.includes(slug)) {
                label = `${label} (creating...)`;
              }
            } else {
              label = option.display;
              slug = option.slug;
            }
            const chipColor = getTopicColor(slug);
            return (
              <CustomChip
                key={key}
                label={label}
                colorHex={chipColor}
                {...itemProps}
              />
            );
          });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder="Select topics or add new topic"
            className="rounded-md" // dark:bg-gray-800 dark:border-gray-700
          />
        )}
        onChange={(event, newValue) => {
          const slugs = newValue.map((val) => {
            if (typeof val === 'string') return val;
            return val.slug;
          });
          setTopics(slugs);
        }}
      />
    </FormControl>
  );
}
