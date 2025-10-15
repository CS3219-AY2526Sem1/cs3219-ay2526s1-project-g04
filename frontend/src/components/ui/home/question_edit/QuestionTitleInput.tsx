'use client';

import { TextField } from "@mui/material";

interface QuestionTitleInputProps {
  title: string;
  setTitle: (value: string) => void;
}

export default function QuestionTitleInput({ title, setTitle }: QuestionTitleInputProps) {
  return (
    <div className='flex flex-col space-y-3'>
      <label className="text-xl font-semibold text-[var(--foreground)]">
        Question Title
      </label>

      <TextField
        required
        id='question-title'
        value={title}
        placeholder='Enter question title'
        className='rounded-md' // dark:bg-gray-800 dark:border-gray-700
        onChange={(e) => setTitle(e.target.value)}
      />
    </div>
  )
}