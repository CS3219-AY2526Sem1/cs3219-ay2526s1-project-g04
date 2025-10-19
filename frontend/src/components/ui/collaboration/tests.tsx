import {
  Card,
  CardContent,
  CardHeader,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import '@/styles/globals.css';
import { useState } from 'react';

interface TestCase {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any[];
}
interface TabPanelProps {
  testCase: TestCase;
  index: number;
  value: number;
}

export const TestCases = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  const testCases: TestCase[] = [
    { title: 'Case 1', input: [1, 2, 3], output: [0, 2, 3] },
    { title: 'Case 2', input: [2, 2, 3], output: [9, 2, 3] },
    { title: 'Case 3', input: [3, 2, 3], output: [8, 2, 3] },
    { title: 'Case 4', input: [4, 2, 3], output: [7, 2, 3] },
    { title: 'Case 5', input: [5, 2, 3], output: [6, 2, 3] },
  ];

  function TabPanel(props: TabPanelProps) {
    const { testCase, value, index, ...other } = props;

    return (
      value === index && (
        <Stack className="h-3/5 overflow-y-scroll" spacing={1}>
          <Typography>Input</Typography>
          <Typography className="bg-gray-100 p-1 px-3 rounded-xl">
            {testCase.input}
          </Typography>
          <Typography>Expected Output</Typography>
          <Typography className="bg-gray-100 p-1 px-3 rounded-xl">
            {testCase.output}
          </Typography>
        </Stack>
      )
    );
  }

  return (
    <Card
      className="flex flex-col h-full w-full shadow-2xl rounded-2xl"
      variant="outlined"
    >
      <CardHeader
        className="p-3 h-1/5"
        title={
          <Typography className="font-bold" variant="body1">
            Test Cases [to be implemented]
          </Typography>
        }
      ></CardHeader>
      <CardContent className="p-3 py-0 h-4/5 flex-1">
        <Tabs
          value={value}
          onChange={handleChange}
          TabIndicatorProps={{
            sx: {
              display: 'none',
            },
          }}
        >
          {testCases.map((testCase, idx) => {
            return (
              <Tab
                key={idx}
                sx={{
                  textTransform: 'none',
                  minHeight: '32px',
                  height: '32px',
                  padding: '4px 12px',
                  '&.Mui-selected': {
                    backgroundColor: '#F3F4F6',
                    borderRadius: '10px',
                    color: 'black',
                  },
                }}
                value={idx}
                label={testCase.title}
              />
            );
          })}
        </Tabs>
        {testCases.map((testCase, idx) => {
          return (
            <TabPanel
              key={idx}
              testCase={testCase}
              value={value}
              index={idx}
            ></TabPanel>
          );
        })}
      </CardContent>
    </Card>
  );
};
