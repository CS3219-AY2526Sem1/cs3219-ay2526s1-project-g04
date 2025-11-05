import { Box, Card, Stack } from '@mui/material';
import '@/styles/globals.css';
import { MessageBoard } from './messaging';
import { DrawingBoard } from './drawing';

export const Communication = () => {
  return (
    <Card className="rounded-2xl shadow-2xl h-full w-full" variant="outlined">
      <Stack direction="row" className="flex justify-center h-full ">
        {/* <MessageBoard></MessageBoard> */}
        <Box className="flex w-full h-full p-2">
          {/* <DrawingBoard></DrawingBoard> */}
        </Box>
      </Stack>
    </Card>
  );
};
