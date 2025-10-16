'use client';

import { useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function AddQuestionButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/home/question-edit')}
      className="flex items-center gap-2 px-4 py-2 rounded-full text-white font-medium text-lg hover:opacity-90 transition"
      style={{
        background: 'linear-gradient(90deg, #2563EB, #8B5CF6)',
      }}
    >
      <PlusIcon className="w-5 h-5" />
      Add New Question
    </button>
  );
}
