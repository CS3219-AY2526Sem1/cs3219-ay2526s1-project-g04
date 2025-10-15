'use client';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getAdminQuestionById, getQuestionById } from '@/services/questionServiceApi';
import TagComponent from '@/components/ui/home/question-view/TagComponent'
import { Question } from '@/lib/question-service';
import { DIFFICULTY_LEVELS } from "@/lib/constants/difficultyLevels";

const USER_ROLE = 'admin'; // implement logic to read form context

export default function QuestionViewPage() {
  const params = useParams();
  const questionId = params.id;
  const [questionData, setQuestionData] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);

  // get question details
  useEffect(() => {
    if (!questionId) return;

    setLoading(true);
    if (USER_ROLE === 'admin') {
      getAdminQuestionById(questionId.toString())
        .then((data) => setQuestionData(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else if (USER_ROLE === 'non-admin') {
      getQuestionById(questionId.toString())
        .then((data) => setQuestionData(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [questionId]);

  // get colours for tag componenents\
  const difficulty_colorhex = DIFFICULTY_LEVELS.find(d => d.name === questionData?.difficulty)?.color_hex || '#6B7280';

  return (
    <div className='flex flex-col gap-y-6'>
      {questionData ? <h1>{questionData.title}</h1> : <h1>Question View Page</h1>}

      {loading ? (
        <p>Loading...</p>
      ) : questionData ? (
        <>
          <div className='flex flex-row gap-2'>
            <TagComponent tagText={questionData.difficulty} color_hex={difficulty_colorhex} />
            {questionData.topics.map((topic) =>(
              <TagComponent 
                key={topic.slug}
                tagText={topic.slug}
                color_hex={topic.color_hex}
              />
            ))}
          </div>
          <div dangerouslySetInnerHTML={{ __html: questionData?.body_html || '' }} />
        </>
      ) : (
        <p>No question found.</p>
      )}
    </div>
  );
}
