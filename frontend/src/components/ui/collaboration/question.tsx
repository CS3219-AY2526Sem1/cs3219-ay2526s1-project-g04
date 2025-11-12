import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import '@/styles/globals.css';
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
      // console.log(1, questionId);

      if (!questionId) return;

      const res = await getQuestionById(questionId);
      if (!res.success) {
        alert(`Error fetching question: ${res.message}`);
        return;
      }

      const question: Question = res.data;
      // console.log(question);
      setQuestionMd(question?.body_html ?? '');
      setQuestionTitle(question?.title ?? '');
      setQuestionTopics(question?.topics ?? []);
      const testCases = question.test_cases?.map((testcase, idx) => {
        return {
          input: JSON.parse(testcase.input_data),
          expectedOutput: JSON.parse(testcase.expected_output),
        };
      });

      // console.log('tc', testCases);
    };
    fetchQuestion();
  }, []);

  return (
    <Card
      className="rounded-2xl shadow-xl h-full w-full"
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '100%',
      }}
    >
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
                className={`border min-w-10`}
                sx={{
                  borderColor: topic.color_hex,
                  color: topic.color_hex,
                }}
              />
            ))}
          </Stack>
        }
        className="h-1/5"
      />
      <CardContent className="h-4/5">
        <Stack className="h-full">
          <Typography
            variant="body1"
            component="div"
            className="
              h-full
              overflow-y-auto 
              whitespace-pre-wrap   
                          
            "
            dangerouslySetInnerHTML={{ __html: questionMd }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};
