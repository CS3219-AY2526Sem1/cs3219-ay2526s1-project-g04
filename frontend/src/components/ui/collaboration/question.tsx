import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  StyledEngineProvider,
  Typography,
} from '@mui/material';
import '@/styles/globals.css';

export const QuestionCard = () => {
  const question_string = `Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem

To add when question service is up


Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem
Lorem Lorem`;

  return (
    <Card className="rounded-2xl shadow-xl h-full w-full" variant="outlined">
      <CardHeader
        title={
          <Typography variant="h5" fontWeight="bold">
            Two Sum
          </Typography>
        }
        subheader={
          <Stack direction="row" spacing={1}>
            <Chip
              label="Array"
              variant="outlined"
              size="medium"
              className="border border-blue-500 text-blue-500 min-w-10"
            />
            <Chip
              label="Array"
              variant="outlined"
              size="medium"
              className="border border-blue-500 text-blue-500 min-w-10"
            />
            <Chip
              label="Array"
              variant="outlined"
              size="medium"
              className="border border-blue-500 text-blue-500 min-w-10"
            />
            <Chip
              label="Array"
              variant="outlined"
              size="medium"
              className="border border-blue-500 text-blue-500 min-w-10"
            />
          </Stack>
        }
      />
      <CardContent>
        <Stack>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {question_string}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};
