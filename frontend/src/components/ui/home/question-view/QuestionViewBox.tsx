'use client';

import { Question } from '@/lib/question-service';
import TagComponent from './TagComponent';
import { DIFFICULTY_LEVELS } from '@/lib/constants/DifficultyLevels';
import { UserRole } from '@/lib/test-data/TestUser';

interface QuestionViewBoxProps {
  questionData: Question;
  userRole: UserRole;
}

export default function QuestionViewBox({
  questionData,
  userRole,
}: QuestionViewBoxProps) {
  const difficulty_colorhex =
    DIFFICULTY_LEVELS.find((d) => d.name === questionData?.difficulty)
      ?.color_hex || '#6B7280';

  const formattedDateOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  };

  return (
    <div className="flex flex-col gap-y-3 bg-white w-full max-h-[40rem] rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.2)] p-10 overflow-y-auto scrollbar-auto">
      <h1>{questionData.title}</h1>

      <div className="flex flex-row items-center gap-x-5">
        {/* Version */}
        {userRole === 'admin' && (
          <div className="flex flex-row items-center gap-x-2">
            <p className="font-bold text-gray-500">Version:</p>
            <p>{questionData.version}</p>
          </div>
        )}

        {/* Status */}
        {userRole === 'admin' && (
          <div className="flex flex-row items-center gap-x-2">
            <p className="font-bold text-gray-500">Status:</p>
            <p>{questionData.status}</p>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex flex-row items-center gap-x-2">
          <p className="font-bold text-gray-500">Last updated:</p>
          <p>
            {new Date(questionData.updated_at).toLocaleDateString(
              'en-GB',
              formattedDateOptions,
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-row items-center gap-x-5 mb-5">
        {/* difficulty */}
        <div className="flex flex-row items-center gap-x-2">
          <p className="font-bold text-gray-500">Difficulty:</p>
          <TagComponent
            tagText={questionData.difficulty}
            color_hex={difficulty_colorhex}
          />
        </div>

        {/* topics */}
        <div className="flex flex-row items-center gap-x-2">
          <p className="font-bold text-gray-500">Topics:</p>
          {questionData.topics.map((topic) => {
            const slug = topic.slug;
            const display = topic.display;
            const color_hex = topic.color_hex;
            return (
              <TagComponent
                key={slug}
                tagText={display}
                color_hex={color_hex}
              />
            );
          })}
        </div>
      </div>

      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: questionData?.body_html || '' }}
      />
    </div>
  );
}
