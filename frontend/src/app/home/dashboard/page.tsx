'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { openSans } from '@/styles/fonts';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import MatchingPopUp from '@/components/ui/matching/MatchingPopUp';
import { WaitingSessionToBeCreatedPopUp } from '@/components/ui/matching/modelwaitiingtoredirect';

// --- Mock Data (Replace with your API data) ---
const user = {
  name: 'kailash201',
  avatar: '/path/to/avatar.png',
};

const practiceHistory = [
  {
    date: '7 September 2025',
    problem: 'Two Sum',
    difficulty: 'Easy',
    peer: 'flexibo',
  },
  {
    date: '7 September 2025',
    problem: 'Contains Duplicate',
    difficulty: 'Easy',
    peer: 'ylchin',
  },
  {
    date: '6 September 2025',
    problem: 'Add Two Numbers',
    difficulty: 'Medium',
    peer: 'coderhuang559',
  },
  {
    date: '5 September 2025',
    problem: 'Median of 2 Sorted Arrays',
    difficulty: 'Hard',
    peer: 'danielleloh',
  },
  {
    date: '5 September 2025',
    problem: 'Zigzag Conversion',
    difficulty: 'Medium',
    peer: 'somerandomuser',
  },
  {
    date: '4 September 2025',
    problem: 'Sudoku Solver',
    difficulty: 'Hard',
    peer: 'randomperson112',
  },
  {
    date: '1 September 2025',
    problem: 'Search Insert Position',
    difficulty: 'Easy',
    peer: '1morerandomuser',
  },
  {
    date: '1 September 2025',
    problem: 'Palindrome Number',
    difficulty: 'Easy',
    peer: 'imdone',
  },
];

const summaryStats = {
  totalSolved: 15,
  easy: 5,
  medium: 5,
  hard: 5,
};
// --- End of Mock Data ---

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 'success';
    case 'medium':
      return 'warning';
    case 'hard':
      return 'error';
    default:
      return 'default';
  }
};

export default function DashboardPage() {
  const [showMatching, setShowMatching] = React.useState(false);
  const [showSessionBeingCreated, setShowSessionBeingCreated] =
    React.useState(true);
  const [sessionId, setSessionId] = React.useState<string | null>('45');
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            fontFamily: openSans.style.fontFamily,
            mb: 4,
            color: '#374151',
          }}
        >
          Welcome back, {user.name}!
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: 4,
          }}
        >
          {/* Left Column */}
          <Box sx={{ width: { xs: '100%', lg: '66.66%' } }}>
            <Stack spacing={4}>
              {/* Start Practising Card */}
              <Card
                sx={{
                  px: 3,
                  py: 5,
                  borderRadius: 3,
                  background:
                    'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
                  color: 'white',
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography
                      sx={{
                        py: 1,
                        textTransform: 'uppercase',
                        fontWeight: 800,
                        letterSpacing: 0.4,
                        fontSize: '1rem',
                        color: 'rgba(255, 255, 255, 0.9)',
                        opacity: 0.6,
                      }}
                    >
                      Sharpen your skills, practice live with peers
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 900,
                        fontFamily: openSans.style.fontFamily,
                      }}
                    >
                      Start Practising.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    onClick={() => setShowMatching(true)}
                    sx={{
                      backgroundColor: 'white',
                      color: '#4F46E5',
                      borderRadius: '999px',
                      px: 4,
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '1rem',
                      '&:hover': {
                        backgroundColor: '#F0F0F0',
                      },
                    }}
                  >
                    Find A Peer
                  </Button>
                </Stack>
              </Card>

              {/* Practice History */}
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 3,
                  boxShadow: '0px 4px 12px rgba(0,0,0,0.05)',
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      fontFamily: openSans.style.fontFamily,
                      color: '#374151',
                    }}
                  >
                    Practice History
                  </Typography>
                  <Link href="#" sx={{ fontWeight: 600, color: '#4F46E5' }}>
                    View all
                  </Link>
                </Stack>
                <TableContainer>
                  <Table
                    sx={{
                      '& .MuiTableCell-root': { borderBottom: 'none', py: 1.5 },
                    }}
                  >
                    <TableHead>
                      <TableRow
                        sx={{
                          '& .MuiTableCell-root': {
                            color: '#6B7280',
                            fontWeight: 600,
                          },
                        }}
                      >
                        <TableCell>
                          Date Attempted{' '}
                          <ArrowUpwardIcon sx={{ fontSize: '1rem' }} />
                        </TableCell>
                        <TableCell>
                          Problem <ArrowUpwardIcon sx={{ fontSize: '1rem' }} />
                        </TableCell>
                        <TableCell>Peer</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {practiceHistory.map((row, index) => (
                        <TableRow
                          key={index}
                          sx={{
                            '&:nth-of-type(odd)': {
                              backgroundColor: '#F9FAFB',
                            },
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500, color: '#374151' }}>
                            {row.date}
                          </TableCell>
                          <TableCell>
                            <Stack>
                              <Typography
                                sx={{ fontWeight: 600, color: '#374151' }}
                              >
                                {row.problem}
                              </Typography>
                              <Chip
                                label={row.difficulty}
                                color={getDifficultyColor(row.difficulty)}
                                size="small"
                                sx={{
                                  width: 'fit-content',
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                }}
                              />
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ color: '#6B7280' }}>
                            {row.peer}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Stack>
          </Box>

          {/* Right Column */}
          <Grid>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                boxShadow: '0px 4px 12px rgba(0,0,0,0.05)',
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  fontFamily: openSans.style.fontFamily,
                  color: '#374151',
                  mb: 2,
                }}
              >
                Summary
              </Typography>
              <Card
                variant="outlined"
                sx={{ borderRadius: 2, borderColor: '#E5E7EB', mb: 4 }}
              >
                <CardContent>
                  <Typography sx={{ color: '#6B7280' }}>
                    Total Solved
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 700, color: '#4F46E5', my: 1 }}
                  >
                    {summaryStats.totalSolved} Problems
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      label={`Easy ${summaryStats.easy}`}
                      color="success"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      label={`Med ${summaryStats.medium}`}
                      color="warning"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      label={`Hard ${summaryStats.hard}`}
                      color="error"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>
                </CardContent>
              </Card>

              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: '#374151', mb: 2 }}
              >
                Categories
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 250,
                  border: '1px dashed #D1D5DB',
                  borderRadius: 2,
                }}
              >
                <Typography sx={{ color: '#9CA3AF' }}>
                  Chart component would go here
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Box>
      </Container>

      {/* {showMatching && (
        <MatchingPopUp
          setSessionId={setSessionId}
          setShowMatching={setShowMatching}
        />
      )} */}
      {/** show wait for 10mins being matched pop */}

      {/** show you are being matched, wait for session to be ctread*/}
      {/* {showSessionBeingCreated && sessionId && (
        <WaitingSessionToBeCreatedPopUp sessionId={sessionId} />
      )} */}
    </Box>
  );
}
