'use client';

import QuestionForm from '@/components/ui/home/question_edit/forms/QuestionForm';

export default function Page() {
  return (
    <div className="flex flex-col gap-y-6">
      <h1>Create New Question</h1>
      <QuestionForm mode="create" />
    </div>
  );
}
