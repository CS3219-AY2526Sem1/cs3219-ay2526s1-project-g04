// import {
//   Card,
//   CardContent,
//   CardHeader,
//   Chip,
//   Stack,
//   Typography,
// } from '@mui/material';
// import '@/styles/globals.css';

// export const QuestionCard = () => {
//   const question_string = `Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem

// To add when question service is up

// Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem Lorem
// Lorem Lorem`;

//   return (
//     <Card className="rounded-2xl shadow-xl h-full w-full" variant="outlined">
//       <CardHeader
//         title={
//           <Typography variant="h5" fontWeight="bold">
//             Two Sum
//           </Typography>
//         }
//         subheader={
//           <Stack direction="row" spacing={1}>
//             <Chip
//               label="Array"
//               variant="outlined"
//               size="medium"
//               className="border border-blue-500 text-blue-500 min-w-10"
//             />
//             <Chip
//               label="Array"
//               variant="outlined"
//               size="medium"
//               className="border border-blue-500 text-blue-500 min-w-10"
//             />
//             <Chip
//               label="Array"
//               variant="outlined"
//               size="medium"
//               className="border border-blue-500 text-blue-500 min-w-10"
//             />
//             <Chip
//               label="Array"
//               variant="outlined"
//               size="medium"
//               className="border border-blue-500 text-blue-500 min-w-10"
//             />
//           </Stack>
//         }
//       />
//       <CardContent>
//         <Stack>
//           <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
//             {question_string}
//           </Typography>
//         </Stack>
//       </CardContent>
//     </Card>
//   );
// };

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
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {`Given an array of integers nums and an integer target, 
return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, 
and you may not use the same element twice.

You can return the answer in any order.`}
          </Typography>

          {/* Example 1 */}
          <Card
            variant="outlined"
            sx={{
              backgroundColor: '#f9fafb',
              borderRadius: 2,
              p: 2,
            }}
          >
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {`Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].`}
            </Typography>
          </Card>

          {/* Example 2 */}
          <Card
            variant="outlined"
            sx={{
              backgroundColor: '#f9fafb',
              borderRadius: 2,
              p: 2,
            }}
          >
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {`Example 2:
Input: nums = [3,2,4], target = 6
Output: [1,2]`}
            </Typography>
          </Card>

          {/* Example 3 */}
          <Card
            variant="outlined"
            sx={{
              backgroundColor: '#f9fafb',
              borderRadius: 2,
              p: 2,
            }}
          >
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {`Example 3:
Input: nums = [3,3], target = 6
Output: [0,1]`}
            </Typography>
          </Card>

          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {`Constraints:
1 <= nums.length <= 10^4
-10^9 <= nums[i] <= 10^9
-10^9 <= target <= 10^9
Only one valid answer exists.`}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};
