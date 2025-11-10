'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QuestionForm from '@/components/ui/home/question_edit/forms/QuestionForm';
import { getAdminQuestionById } from '@/services/questionServiceApi';
import { Question } from '@/lib/question-service';

export default function Page() {
  const params = useParams();
  const id = params.id;
  const [questionData, setQuestionData] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getAdminQuestionById(id.toString())
      .then((res) => {
        if (!res.success) {
          alert(`⚠️ Error: ${res.message}`);
          return;
        }

        const data = res.data;

        console.log(`[Question Form] Question data retrieved: ${data}`);
        setQuestionData(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="flex flex-col gap-y-6">
      <h1>Edit Question</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <QuestionForm mode="edit" initialData={questionData ?? undefined} />
      )}
    </div>
  );
}
