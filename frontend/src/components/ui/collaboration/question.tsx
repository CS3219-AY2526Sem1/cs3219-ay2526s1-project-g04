import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import '@/styles/globals.css';
import ReactMarkdown from 'react-markdown';
import { getQuestionById } from '@/services/questionServiceApi';
import { useEffect, useState } from 'react';
import { getQuestionIdBySessId } from '@/services/collaborationServiceApi';
import { Question, Topic } from '@/lib/question-service';

interface questionProps {
  sessionId: string;
}

export const QuestionCard = (p: questionProps) => {
  const { sessionId } = p;

  const [questionTitle, setQuestionTitle] = useState('');
  const [questionMd, setQuestionMd] = useState('');
  const [questionTopics, setQuestionTopics] = useState<Topic[]>([]);

  useEffect(() => {
    const fetchQuestion = async () => {
      const questionId: string | null = await getQuestionIdBySessId(sessionId);
      console.log(1, questionId);
      if (!questionId) return;
      const question: Question | null = await getQuestionById(questionId);
      console.log(question);
      setQuestionMd(question?.body_md ?? '');
      setQuestionTitle(question?.title ?? '');
      setQuestionTopics(question?.topics ?? []);
    };
    fetchQuestion();
  }, []);

  return (
    <Card className="rounded-2xl shadow-xl h-full w-full" variant="outlined">
      <CardHeader
        title={
          <Typography variant="h5" fontWeight="bold">
            {questionTitle}
          </Typography>
        }
        subheader={
          <Stack direction="row" spacing={1}>
            {questionTopics.map((topic: Topic, idx: number) => (
              <Chip
                key={idx}
                label={topic.slug}
                variant="outlined"
                size="medium"
                className="border border-blue-500 text-blue-500 min-w-10"
              />
            ))}
          </Stack>
        }
      />
      <CardContent>
        <Stack>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            <ReactMarkdown>{questionMd}</ReactMarkdown>
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};
