'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  patchAdminQuestions,
  postAdminQuestions,
} from '@/services/questionServiceApi';
import {
  Attachment,
  Question,
  TestCase,
  postAdminQuestionsRequest,
} from '@/lib/question-service/index';
import QuestionTitleInput from '../QuestionTitleInput';
import DifficultySelect from '../DifficultySelect';
import AttachmentsSection from '../file-attachment-components/AttachmentsSection';
import QuestionBodyInput from '../QuestionBodyInput';
import SubmitButton from '../SubmitButton';
import StarterCodeInput from '../StarterCodeInput';
import TestCasesInput from '../test-case-component/TestCasesInput';
import TopicInputSection from '../topic-select-component/TopicInputSection';
// import { TEST_QUESTION_VIEW } from '@/lib/test-data/TestQuestionView';

interface QuestionFormProps {
  mode: 'create' | 'edit';
  initialData?: Question;
}

export default function QuestionForm({ mode, initialData }: QuestionFormProps) {
  const router = useRouter();

  // initialData = TEST_QUESTION_VIEW; // for test

  // form responses
  const [title, setTitle] = useState(initialData?.title || '');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>(
    initialData?.difficulty || 'Easy',
  );
  const [topics, setTopics] = useState<string[]>(
    initialData?.topics.map((t) => t.slug) || [],
  );
  const [attachments, setAttachments] = useState<Attachment[]>(
    initialData?.attachments || [],
  );
  const [body, setBody] = useState(initialData?.body_md || '');
  const [starterCode, setStarterCode] = useState(
    initialData?.starter_code || '',
  );
  const [entryPoint, setEntryPoint] = useState(initialData?.entry_point || '');
  const [testCases, setTestCases] = useState<TestCase[]>(
    initialData?.test_cases || [],
  );

  // submit form logic
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ensure compulsory fields are all filled
    if (!title.trim()) {
      return alert('Title cannot be empty.');
    }

    if (!difficulty.trim()) {
      return alert('Please select a difficulty level.');
    }

    if (topics.length === 0) {
      return alert('Question needs to have at least one topic.');
    }

    if (!body.trim()) {
      return alert('Question body cannot be empty.');
    }

    if (!starterCode.trim()) {
      return alert('Starter code cannot be empty.');
    }

    if (!entryPoint.trim()) {
      return alert('Starter code entry point cannot be empty.');
    }

    if (testCases.length === 0) {
      return alert('Question needs to have at least one test case.');
    }

    const newData: postAdminQuestionsRequest = {
      title: title,
      body_md: body,
      difficulty: difficulty,
      topics: topics,
      attachments: attachments,
      starter_code: starterCode,
      entry_point: entryPoint,
      test_cases: testCases,
    };
    // console.log(`Submission contents: ${newData}`);

    if (mode === 'edit' && initialData) {
      const payload = Object.entries(newData).reduce<Record<string, unknown>>(
        (acc, [key, value]) => {
          type QuestionKey = keyof typeof initialData;
          const typedKey = key as QuestionKey;
          const oldValue = initialData[typedKey];

          // for topics, only compare the slugs
          if (typedKey === 'topics') {
            const oldSlugs = initialData.topics.map((t) => t.slug);
            if (JSON.stringify(oldSlugs) !== JSON.stringify(value)) {
              acc[typedKey] = value;
            }
          } else if (value !== oldValue) {
            acc[typedKey] = value;
          }

          return acc;
        },
        {},
      );

      if (Object.keys(payload).length === 0) {
        alert('No changes detected.');
        return;
      }

      // PATCH
      (async () => {
        try {
          const res = await patchAdminQuestions(initialData.id, payload);
          if (!res.success) {
            alert(res.message);
            return;
          }
          // console.log('Question updated: ', res);
          alert('Question updated successfully!');

          router.push('/home/question-bank');
        } catch (err) {
          console.error('Failed to update question: ', err);
          alert('Failed to update question. Please try again.');
        }
      })();
      return;
    }

    // CREATE
    (async () => {
      try {
        const res = await postAdminQuestions(newData);
        if (!res.success) {
          alert(res.message);
          return;
        }
        // console.log('Question submitted: ', res);

        alert('Question successfully submitted!');
        router.push('/home/question-bank');
      } catch (err) {
        console.error('Failed to submit question: ', err);
        alert('Failed to submit question. Please try again.');
      }
    })();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-y-5">
        {/* Question Title */}
        <QuestionTitleInput title={title} setTitle={setTitle} />

        <div className="grid grid-cols-2 gap-x-5 items-start">
          {/* Difficulty */}
          <DifficultySelect
            difficulty={difficulty}
            setDifficulty={setDifficulty}
          />

          {/* Topics */}
          <TopicInputSection
            selectedTopicSlugs={topics}
            setSelectedTopicSlugs={setTopics}
          />
        </div>

        <AttachmentsSection
          id={initialData?.id}
          attachments={attachments}
          setAttachments={setAttachments}
        />

        {/* Question Body */}
        <QuestionBodyInput body={body} setBody={setBody} />
        <StarterCodeInput
          starterCode={starterCode}
          setStarterCode={setStarterCode}
          entryPoint={entryPoint}
          setEntryPoint={setEntryPoint}
        />
        <TestCasesInput testCases={testCases} setTestCases={setTestCases} />
        <SubmitButton />
      </div>
    </form>
  );
}
