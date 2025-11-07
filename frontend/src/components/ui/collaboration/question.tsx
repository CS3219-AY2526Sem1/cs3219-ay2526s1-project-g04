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

      const res = await getQuestionById(questionId);
      if (!res.success) {
        alert(`⚠️ Error fetching question: ${res.message}`);
        return;
      }

      const question: Question = res.data;
      console.log(question);
      setQuestionMd(question?.body_md ?? '');
      setQuestionTitle(question?.title ?? '');
      setQuestionTopics(question?.topics ?? []);
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
          <Card
            variant="outlined"
            sx={{
              backgroundColor: '#f9fafb',
              borderRadius: 2,
              p: 2,
              boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.3)',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'Roboto Mono, monospace',
              }}
              dangerouslySetInnerHTML={{
                __html: `<strong>Input</strong>: nums = [2,7,11,15], target = 9
<strong>Output</strong>: [0,1]
<strong>Explanation</strong>: Because nums[0] + nums[1] == 9, we return [0, 1].`,
              }}
            />
          </Card>

          {/* Example 2 */}
          <Typography fontWeight="bold" sx={{ mt: 1 }}>
            Example 2
          </Typography>
          <Card
            variant="outlined"
            sx={{
              backgroundColor: '#f9fafb',
              borderRadius: 2,
              p: 2,
              boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.3)',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'Roboto Mono, monospace',
              }}
              dangerouslySetInnerHTML={{
                __html: `<strong>Input</strong>: nums = [3,2,4], target = 6
<strong>Output</strong>: [1,2]`,
              }}
            />
          </Card>

          {/* Example 3 */}
          <Typography fontWeight="bold" sx={{ mt: 1 }}>
            Example 3
          </Typography>
          <Card
            variant="outlined"
            sx={{
              backgroundColor: '#f9fafb',
              borderRadius: 2,
              p: 2,
              boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.3)',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'Roboto Mono, monospace',
              }}
              dangerouslySetInnerHTML={{
                __html: `<strong>Input</strong>: nums = [3,3], target = 6
<strong>Output</strong>: [0,1]`,
              }}
            />
          </Card>

          {/* Constraints */}
          <Typography fontWeight="bold">Constraints</Typography>

          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'Roboto Mono, monospace',
            }}
            dangerouslySetInnerHTML={{
              __html: `<b>1</b> ≤ <b>nums.length</b> ≤ 10<sup>4</sup>
−10<sup>9</sup> ≤ <b>nums[i]</b> ≤ 10<sup>9</sup>
−10<sup>9</sup> ≤ <b>target</b> ≤ 10<sup>9</sup><br/>
Only one valid answer exists.
    `,
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};
