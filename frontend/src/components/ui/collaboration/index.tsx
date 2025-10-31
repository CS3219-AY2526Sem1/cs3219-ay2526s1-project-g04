import { Box, Stack } from '@mui/material';
import CollabMonaco from './CollabMonaco';
import { Communication } from './communication';
import { QuestionCard } from './question';
import { TestCases } from './tests';
import { CollabProvider } from './CollabProvider';

export const Collaboration = () => {
  return (
    <Stack spacing={2} direction="row" className="h-full w-full">
      <Stack spacing={2} className="h-full w-1/2">
        <QuestionCard></QuestionCard>
        <Communication></Communication>
      </Stack>
      <Stack spacing={2} className="h-full w-1/2">
        <Box className="flex w-full h-60/100">
          <CollabProvider>
            <CollabMonaco></CollabMonaco>
          </CollabProvider>
        </Box>
        <Box className="flex w-full h-40/100">
          <TestCases></TestCases>
        </Box>
      </Stack>
    </Stack>
  );
};
