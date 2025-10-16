'use client';

import { useState } from 'react';
import { Chip, FormControl, MenuItem, Select, TextField } from '@mui/material';

const DIFFICULTY_LEVELS = [
  { name: 'Easy', color: '#22C55E' },
  { name: 'Medium', color: '#FEBC2F' },
  { name: 'Hard', color: '#EF4444' },
];

export default function QuestionForm1() {
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [body, setBody] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(
      `form submitted with contents: 
            Title: ${title}
            Difficulty: ${difficulty}
            Topics: ${topics.join(', ')}
            Body: ${body}
            `,
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-y-5">
        {/* Question Title */}
        <div className="flex flex-col space-y-3">
          <label className="text-xl font-semibold text-[var(--foreground)]">
            Question Title
          </label>
          <TextField
            required
            id="question-title"
            value={title}
            placeholder="Enter question title"
            className="rounded-md dark:bg-gray-800 dark:border-gray-700"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-5">
          {/* Difficulty */}
          <div className="flex flex-col space-y-3">
            <FormControl fullWidth required>
              <label className="text-xl font-semibold text-[var(--foreground)] mb-3">
                Diffculty
              </label>
              <Select
                id="question-difficulty"
                value={difficulty}
                className="rounded-md dark:bg-gray-800 dark:border-gray-700"
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <MenuItem value="" disabled>
                  Select difficulty
                </MenuItem>

                {DIFFICULTY_LEVELS.map((difficultyLevels) => (
                  <MenuItem
                    key={difficultyLevels.name}
                    value={difficultyLevels.name}
                  >
                    <span
                      className="py-1 px-3 rounded-full"
                      style={{
                        border: `2px solid ${difficultyLevels.color}`,
                        color: `${difficultyLevels.color}`,
                      }}
                    >
                      {difficultyLevels.name}
                    </span>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Topics */}
          <div className="flex flex-col space-y-3">
            <FormControl required>
              <label className="text-xl font-semibold text-[var(--foreground)]">
                Topics
              </label>
            </FormControl>
          </div>
        </div>
      </div>
    </form>
  );
}
