'use client';

import * as React from 'react';
import { Tooltip } from '@mui/material';
import { PlusIcon } from '@heroicons/react/24/outline';
import { postTopicRequest, Topic } from '@/lib/question-service';
import { TOPIC_COLORS } from '@/lib/constants/TopicColors';
import { postAdminTopics } from '@/services/questionServiceApi';

interface props {
  registeredTopics: Topic[];
  setRegisteredTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  setSelectedTopicSlugs: React.Dispatch<React.SetStateAction<string[]>>;
}

function getRandomColor() {
  if (TOPIC_COLORS.length === 0) {
    return '#FF383C'; // default colour
  }

  const randomIdx = Math.floor(Math.random() * TOPIC_COLORS.length);
  return TOPIC_COLORS[randomIdx];
}

export default function TopicCreation({
  registeredTopics,
  setRegisteredTopics,
  setSelectedTopicSlugs,
}: props) {
  const [newTopic, setNewTopic] = React.useState('');
  const [creating, setCreating] = React.useState<boolean>(false);

  const handleCreate = async () => {
    const trimmed = newTopic.trim();
    if (trimmed === '') {
      alert('Please enter a topic name.');
      return;
    }

    const topicName = trimmed.toLowerCase();
    const exists = registeredTopics.some(
      (topic: Topic) => topic.display.toLowerCase() === topicName,
    );
    if (exists) {
      alert('This topic already exists.');
      return;
    }

    setCreating(true);
    try {
      const color = getRandomColor();

      const payload: postTopicRequest = {
        display: trimmed,
        color_hex: color,
      };

      const res = await postAdminTopics(payload);

      if (!res.success) {
        alert(`Failed to create topic ${newTopic}: ${res.message}`);
        return;
      }
      const createdTopic: Topic = res.data;

      setRegisteredTopics((prev) => [...prev, createdTopic]);
      setSelectedTopicSlugs((prev) => [...prev, createdTopic.slug]);
      setNewTopic('');
    } catch (error) {
      console.error('Error creating topic:', error);
      alert('An error occurred while creating the topic.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-row items-center justify-centre gap-x-2">
      <input
        value={newTopic}
        onChange={(e) => setNewTopic(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleCreate();
          }
        }}
        placeholder="Enter new topics here"
        className="flex-1 h-14 p-5 rounded-md border border-gray-300 hover:bg-blue-100 disabled:bg-gray-100"
        disabled={creating}
      />

      <Tooltip title="Create new topic">
        <button
          type="button"
          className="flex w-12 h-12 items-center justify-center rounded-full p-2 border border-gray-300 group hover:bg-blue-100 disabled:cursor-not-allowed"
          disabled={creating}
          onClick={handleCreate}
        >
          <PlusIcon className="w-6 h-6 text-gray-500 group-hover:text-blue-500" />
        </button>
      </Tooltip>
    </div>
  );
}
