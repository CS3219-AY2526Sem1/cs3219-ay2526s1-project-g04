'use client';

import TextField from '@mui/material/TextField';

interface QuestionBodyInputProps {
  body: string;
  setBody: (value: string) => void;
}

export default function QuestionBodyInput({
  body,
  setBody,
}: QuestionBodyInputProps) {
  return (
    <div className="flex flex-col space-y-3">
      <label className="text-xl font-semibold text-[var(--foreground)]">
        Question Body
      </label>

      <TextField
        required
        multiline
        id="question-body"
        value={body}
        placeholder="Enter question body in Markdown format here. "
        className="rounded-md" // dark:bg-gray-800 dark:border-gray-700
        rows={25}
        onChange={(e) => setBody(e.target.value)}
      />
    </div>
  );
}
