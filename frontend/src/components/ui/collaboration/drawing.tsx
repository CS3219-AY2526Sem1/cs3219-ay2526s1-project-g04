import { Card, CardContent, Typography } from '@mui/material';
import '@/styles/globals.css';

export const DrawingBoard = () => {
  return (
    <Card
      variant="outlined"
      className="w-full h-full rounded-2xl border border-3 border-gray-100"
    >
      <CardContent>
        <Typography>Drawing board to be implemented</Typography>
      </CardContent>
    </Card>
  );
};
