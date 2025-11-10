'use client';

import * as React from 'react';
import { Topic } from '@/lib/question-service';

interface props {
  topic: Topic;
}

export default function TopicChip({ topic }: props) {
  const display = topic.display;
  const color = topic.color_hex;

  return (
    <span
      className="rounded-full py-1 px-3 border whitespace-nowrap"
      style={{
        borderColor: color,
        color: color,
      }}
    >
      {display}
    </span>
  );
}
