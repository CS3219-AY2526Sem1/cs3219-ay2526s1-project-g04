'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Tooltip } from '@mui/material';
import { Question, Topic } from '@/lib/question-service';
import { DIFFICULTY_LEVELS } from '@/lib/constants/DifficultyLevels';

interface props {
  question: Question;
  userRole: string | null;
}

export default function QuestionDisplayCard({ userRole, question }: props) {
  const router = useRouter();

  const question_id = question.id;
  const title = question.title;
  const version = question.version ?? 'N/A';
  const status = question.status;

  const formattedDateOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  };
  const lastUpdated = new Date(question.updated_at).toLocaleDateString(
    'en-GB',
    formattedDateOptions,
  );

  const difficulty = question.difficulty;
  const difficulty_hex = DIFFICULTY_LEVELS.find(
    (d) => d.name === difficulty,
  )?.color_hex;

  const topics: Topic[] = question.topics;

  const snippet = question.snippet_html ?? '';

  const handleClick = () => {
    router.push(`/home/question-view/${question_id}`);
  };

  return (
    <Tooltip title={`View ${title}`}>
      <button
        type="button"
        onClick={handleClick}
        className="flex flex-col gap-y-3 items-start w-full h-50 rounded-xl p-5 border border-gray-400 hover:bg-blue-100"
      >
        <p className="text-xl font-bold text-gray-700">{title}</p>

        {userRole === 'ADMIN' && (
          <div className="flex flex-row items-center gap-x-5">
            <div className="flex items-center gap-x-2">
              <p className="font-semibold text-gray-500">Version:</p>
              <p>{version}</p>
            </div>

            <div className="flex items-center gap-x-2">
              <p className="font-semibold text-gray-500">Status:</p>
              <p>{status}</p>
            </div>

            <div className="flex items-center gap-x-2">
              <p className="font-semibold text-gray-500">Last Updated:</p>
              <p>{lastUpdated}</p>
            </div>
          </div>
        )}

        <div className="flex flex-row items-center gap-x-5">
          {/* difficulty */}
          <div className="flex items-center gap-x-2">
            <p className="font-semibold text-gray-500">Difficulty: </p>
            <span
              className="rounded-full px-3 py-1 border text-sm"
              style={{
                borderColor: difficulty_hex ?? '#64748b',
                color: difficulty_hex ?? '#64748b',
              }}
            >
              {difficulty}
            </span>
          </div>

          {/* topics */}
          <div className="flex items-center gap-x-2">
            <p className="font-semibold text-gray-500">Topics: </p>
            {topics.map((topic) => (
              <span
                key={topic.slug}
                className="rounded-full px-3 py-1 border text-sm"
                style={{
                  borderColor: topic.color_hex ?? '#64748b',
                  color: topic.color_hex ?? '#64748b',
                }}
              >
                {topic.display}
              </span>
            ))}
          </div>
        </div>

        <div
          className="text-sm text-gray-500 overflow-hidden line-clamp-2 text-left"
          dangerouslySetInnerHTML={{ __html: snippet }}
        />
      </button>
    </Tooltip>
  );
}
