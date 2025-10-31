import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import '@/styles/globals.css';

export const QuestionCard = () => {
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
          <Typography
            variant="h3"
            fontWeight="bold"
            sx={{ color: 'text.secondary' }}
          >
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
              label="Hash Table"
              variant="outlined"
              size="medium"
              className="border border-green-500 text-green-500 min-w-10"
            />
            <Chip
              label="Math"
              variant="outlined"
              size="medium"
              className="border border-purple-500 text-purple-500 min-w-10"
            />
          </Stack>
        }
      />

      <CardContent
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          paddingRight: 2,
          paddingBottom: 2,
        }}
      >
        <Stack spacing={2}>
          {/* Description */}
          <Typography
            variant="body1"
            sx={{ whiteSpace: 'pre-wrap' }}
            dangerouslySetInnerHTML={{
              __html: `Given an array of <strong>indices</strong> nums and an integer target, 
return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

`,
            }}
          />

          {/* Example 1 */}
          <Typography fontWeight="bold" sx={{ mt: 1 }}>
            Example 1
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
