'use client';

import {
  FormControl,
  MenuItem,
  Select
} from '@mui/material';
import { DIFFICULTY_LEVELS } from '@/lib/constants/difficultyLevels';

interface DifficultySelectProps {
  difficulty: string;
  setDifficulty: React.Dispatch<React.SetStateAction<"Easy" | "Medium" | "Hard">>;
}

export default function DifficultySelect({ difficulty, setDifficulty }: DifficultySelectProps) {
  return (
    <div className='flex flex-col'>
      <FormControl fullWidth required>
        <label className="text-xl font-semibold text-[var(--foreground)] mb-3">
          Difficulty
        </label>

        <Select
          id='question-difficulty'
          value={difficulty}
          className='rounded-md' // dark:bg-gray-800 dark:border-gray-700
          onChange={(e) => setDifficulty(e.target.value as "Easy" | "Medium" | "Hard")}
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
                  border: `1px solid ${difficultyLevels.color_hex}`,
                  color: `${difficultyLevels.color_hex}`
                }}
              >
                {difficultyLevels.name}
              </span>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  )
}
