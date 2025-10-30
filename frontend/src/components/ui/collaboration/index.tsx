import { Box, Stack } from '@mui/material';
import CollabMonaco from './CollabMonaco';
import { Communication } from './communication';
import { QuestionCard } from './question';
import { TestCases } from './tests';

interface CollaborationProps {
  sessionId: string;
}

export const Collaboration = (p: CollaborationProps) => {
  const { sessionId } = p;
  return (
    <Stack spacing={2} direction="row" className="h-full w-full">
      <Stack spacing={2} className="h-full w-1/2">
        <QuestionCard sessionId={sessionId}></QuestionCard>
        <Communication></Communication>
      </Stack>
      <Stack spacing={2} className="h-full w-1/2">
        <Box className="flex w-full h-55/100">
          <CollabMonaco></CollabMonaco>
        </Box>
        <Box className="flex w-full h-45/100">
          <TestCases></TestCases>
        </Box>
      </Stack>
    </Stack>
  );
};
