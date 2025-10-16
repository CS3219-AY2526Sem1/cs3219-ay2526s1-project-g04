'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getTopics,
  patchQuestion,
  postQuestion,
} from '@/services/questionServiceApi';
import { Attachment, Topic, Question } from '@/lib/question-service/index';
import QuestionTitleInput from '../QuestionTitleInput';
import DifficultySelect from '../DifficultySelect';
import AttachmentsSection from '../file-attachment-components/AttachmentsSection';
import TopicAutocomplete from '../topic-select-component/TopicAutocomplete';
import QuestionBodyInput from '../QuestionBodyInput';
import SubmitButton from '../SubmitButton';

interface QuestionFormProps {
  mode: 'create' | 'edit';
  initialData?: Question;
}

export default function QuestionForm({ mode, initialData }: QuestionFormProps) {
  const router = useRouter();

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

  // get the topic list and colours
  const [topicList, setTopicList] = useState<Topic[]>([]);
  useEffect(() => {
    getTopics()
      .then((data) => {
        const { items } = data;
        if (!items) return;

        // sort
        const sortedItems = items.sort((a: Topic, b: Topic) =>
          a.slug.toLowerCase().localeCompare(b.slug.toLowerCase()),
        );

        console.log('Items:', sortedItems); // log for test
        setTopicList(sortedItems);
      })
      .catch((err) => console.error(err));
  }, []);

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

    const newData = {
      title: title,
      body_md: body,
      difficulty: difficulty,
      topics: topics,
      attachments: attachments,
    };
    console.log(`Submission contents: ${newData}`);

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
          const res = await patchQuestion(initialData.id, payload);
          console.log('Question updated: ', res);

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
        const res = await postQuestion(newData);
        console.log('Question submitted: ', res);

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

        <div className="grid grid-cols-2 gap-x-5">
          {/* Difficulty */}
          <DifficultySelect
            difficulty={difficulty}
            setDifficulty={setDifficulty}
          />

          {/* Topics */}
          <TopicAutocomplete
            topics={topics}
            setTopics={setTopics}
            topicList={topicList}
          />
        </div>

        <AttachmentsSection
          id={initialData?.id}
          attachments={attachments}
          setAttachments={setAttachments}
        />

        {/* Question Body */}
        <QuestionBodyInput body={body} setBody={setBody} />
        <SubmitButton />
      </div>
    </form>
  );
}
