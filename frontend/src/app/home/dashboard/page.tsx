'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { DIFFICULTY_LEVELS } from '@/lib/constants/difficultyLevels';
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
  CircularProgress,
} from '@mui/material';
import { openSans } from '@/styles/fonts';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // For "Solved" status
import CancelIcon from '@mui/icons-material/Cancel';
import CategoryChart from "@/components/ui/home/dashboard/CategoryChart"; // For "Attempted" status
import MatchingPopUp from '@/components/ui/matching/MatchingPopUp';

// --- Mock Data (Replace with your API data) ---

// --- MOCK DATABASES (Simulating your microservices) ---
const mockSessionData = [
  {
    sessionId: 1,
    questionId: 'q1',
    userIds: [1, 2],
    createdAt: '2025-09-07T10:00:00Z',
    isSolved: true,
  },
  {
    sessionId: 2,
    questionId: 'q2',
    userIds: [1, 3],
    createdAt: '2025-09-07T11:00:00Z',
    isSolved: true,
  },
  {
    sessionId: 3,
    questionId: 'q3',
    userIds: [1, 4],
    createdAt: '2025-09-06T14:00:00Z',
    isSolved: false,
  }, // Not solved
  {
    sessionId: 4,
    questionId: 'q4',
    userIds: [1, 2],
    createdAt: '2025-09-05T16:00:00Z',
    isSolved: true,
  },
  {
    sessionId: 5,
    questionId: 'q1',
    userIds: [1, 3],
    createdAt: '2025-09-04T12:00:00Z',
    isSolved: true,
  },
  {
    sessionId: 6,
    questionId: 'q1',
    userIds: [1, 3],
    createdAt: '2025-09-04T12:00:00Z',
    isSolved: true,
  },
];
const mockQuestionDatabase: Record<string, any> = {
  q1: {
    id: 'q1',
    title: 'Two Sum',
    difficulty: 'Easy',
    topics: ['Array', 'Hash Table'],
  },
  q2: {
    id: 'q2',
    title: 'Contains Duplicate',
    difficulty: 'Easy',
    topics: ['soidfjosijfodjf'],
  },
  q3: {
    id: 'q3',
    title: 'Add Two Numbers',
    difficulty: 'Medium',
    topics: ['sdfdfjojdojfodjf List', 'bfibjibjij'],
  },
  q4: {
    id: 'q4',
    title: 'Median of 2 Sorted Arrays',
    difficulty: 'Hard',
    topics: ['dfiosjiofjiodjfoi', 'dkfjdifjidjfidjfidjf Search'],
  },
};
const mockUserDatabase: Record<number, any> = {
  1: { id: 1, username: 'kailash201' },
  2: { id: 2, username: 'flexibo' },
  3: { id: 3, username: 'ylchin' },
  4: { id: 4, username: 'coderhuang559' },
};
// --- End of Mock Data ---

// Helper to simulate API calls
const fakeFetch = (db: Record<string, any>, ids: string[] | number[]) => {
  return new Promise<any[]>((resolve) => {
    setTimeout(() => {
      const results = ids.map((id) => db[id]).filter(Boolean);
      resolve(results);
    }, 200);
  });
};

// Type definitions
interface UserJwtPayload {
  userId: number;
  username: string;
  role: 'USER' | 'ADMIN';
  iat: number;
  exp: number;
}
interface RawSession {
  sessionId: number;
  questionId: string;
  userIds: number[];
  createdAt: string;
  isSolved: boolean; // --- ADDED ---
}
interface EnrichedSession {
  id: number;
  createdAt: string;
  isSolved: boolean; // --- ADDED ---
  question: {
    title: string;
    difficulty: string;
    topics: string[];
  };
  peer: {
    username: string;
  };
}
interface AnalyticsStats {
  totalSolved: number;
  easy: number;
  medium: number;
  hard: number;
  categories: Record<string, number>;
}

const getDifficultyHex = (difficultyName: string) => {
  const level = DIFFICULTY_LEVELS.find(
    (l) => l.name.toLowerCase() === difficultyName.toLowerCase(),
  );
  return level ? level.color_hex : '#808080'; // Default gray
};

export default function DashboardPage() {
    const [showMatching, setShowMatching] = React.useState(false);
    const [user, setUser] = useState<UserJwtPayload | null>(null);
    const [history, setHistory] = useState<EnrichedSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

  // 1. Data Fetching and Orchestration
  useEffect(() => {
    const loadDashboardData = async () => {
      let currentUserId: number | null = null;
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/accounts/login');
        return;
      }
      try {
        const decodedToken = jwtDecode<UserJwtPayload>(token);
        setUser(decodedToken);
        currentUserId = decodedToken.userId;
      } catch (error) {
        console.error('Invalid token:', error);
        router.push('/accounts/login');
        return;
      }

      try {
        // Simulating: const historyRes = await fetchWithAuth('http://localhost:3002/sessions/me');
        const rawSessions: RawSession[] = mockSessionData;

        const questionIds = [...new Set(rawSessions.map((s) => s.questionId))];
        const peerIds = [
          ...new Set(
            rawSessions
              .flatMap((s) => s.userIds)
              .filter((id) => id !== currentUserId),
          ),
        ];

        const [questionData, peerData] = await Promise.all([
          fakeFetch(mockQuestionDatabase, questionIds),
          fakeFetch(mockUserDatabase, peerIds),
        ]);

        const questionMap = new Map(questionData.map((q) => [q.id, q]));
        const peerMap = new Map(peerData.map((p) => [p.id, p]));

        // --- UPDATED: "Stitch" the data together, including isSolved ---
        const enrichedSessions = rawSessions.map((session) => {
          const peerId = session.userIds.find((id) => id !== currentUserId);
          const peer = peerMap.get(peerId!) || { username: 'Unknown' };
          const question = questionMap.get(session.questionId) || {
            title: 'Unknown Question',
            difficulty: 'Easy',
            topics: [],
          };
          return {
            id: session.sessionId,
            createdAt: session.createdAt,
            isSolved: session.isSolved, // --- ADDED ---
            question: {
              title: question.title,
              difficulty: question.difficulty,
              topics: question.topics,
            },
            peer: { username: peer.username },
          };
        });
        setHistory(enrichedSessions);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, [router]);

  // 2. Frontend Analytics Calculation
  const stats: AnalyticsStats = useMemo(() => {
    // --- UPDATED: Only filter for solved sessions ---
    const solvedSessions = history.filter((session) => session.isSolved);

    const totalSolved = solvedSessions.length;
    let easy = 0;
    let medium = 0;
    let hard = 0;
    const categories: Record<string, number> = {};

    // --- UPDATED: Loop over SOLVED sessions only ---
    for (const session of solvedSessions) {
      const difficulty = session.question.difficulty.toLowerCase();
      if (difficulty === 'easy') easy++;
      else if (difficulty === 'medium') medium++;
      else if (difficulty === 'hard') hard++;
      for (const topic of session.question.topics) {
        categories[topic] = (categories[topic] || 0) + 1;
      }
    }

    console.log('Calculated Solved Categories:', categories);

    return { totalSolved, easy, medium, hard, categories };
  }, [history]); // Recalculates only when history changes

  // --- 3. Loading State ---
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#F9FAFB',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Box
      sx={{
        pt: 5,
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
            opacity: 0.8,
          }}
        >
          Welcome back, {user?.username}!
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
                  sx={{ mb: 2, pb: 0 }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      fontFamily: openSans.style.fontFamily,
                      color: '#374151',
                      opacity: 0.6,
                    }}
                  >
                    Recent Sessions
                  </Typography>
                  <Link
                    href="/home/practice-history"
                    sx={{ fontWeight: 600, color: '#4F46E5' }}
                  >
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
                        <TableCell>Date</TableCell>
                        <TableCell>Problem</TableCell>
                        <TableCell>Peer</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* --- RENDER FROM DYNAMIC HISTORY STATE --- */}
                      {history.slice(0, 6).map((row) => (
                        <TableRow
                          key={row.id}
                          sx={{
                            '&:nth-of-type(odd)': {
                              backgroundColor: '#F9FAFB',
                            },
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500, color: '#374151' }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500 }}
                            >
                              {new Date(row.createdAt).toLocaleDateString()}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: '#6B7280' }}
                            >
                              {new Date(row.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack>
                              <Typography
                                sx={{ fontWeight: 600, color: '#374151' }}
                              >
                                {row.question.title}
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ flexWrap: 'wrap', gap: 0.5 }}
                              >
                                <Chip
                                  label={row.question.difficulty}
                                  variant="outlined"
                                  size="small"
                                  sx={{
                                    width: 'fit-content',
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                    color: getDifficultyHex(
                                      row.question.difficulty,
                                    ),
                                    borderColor: getDifficultyHex(
                                      row.question.difficulty,
                                    ),
                                    height: '20px',
                                  }}
                                />
                                {/* --- ADDED: Topic bubbles --- */}
                                {row.question.topics.map((topic) => (
                                  <Chip
                                    key={topic}
                                    label={topic}
                                    size="small"
                                    sx={{
                                      width: 'fit-content',
                                      fontWeight: 500,
                                      fontSize: '0.7rem',
                                      color: '#5A6372', // Neutral dark grey
                                      backgroundColor: '#F3F4F6', // Light grey background
                                      border: 'none',
                                      height: '20px',
                                    }}
                                  />
                                ))}
                              </Stack>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ color: '#6B7280' }}>
                            {row.peer.username}
                          </TableCell>
                          <TableCell>
                            {row.isSolved ? (
                              <Chip
                                label="Solved"
                                size="small"
                                icon={<CheckCircleIcon fontSize="small" />}
                                color="success"
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                            ) : (
                              <Chip
                                label="Attempted"
                                size="small"
                                icon={<CancelIcon fontSize="small" />}
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                              />
                            )}
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
          <Box sx={{ width: { xs: '100%', lg: '33.33%' } }}>
            <Stack spacing={4}>
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    fontFamily: openSans.style.fontFamily,
                    color: '#374151',
                    mb: 2,
                    opacity: 0.6,
                  }}
                >
                  Summary
                </Typography>
                <Stack spacing={2}>
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      boxShadow: '0px 4px 12px rgba(0,0,0,0.05)',
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: '#374151',
                        mb: 1,
                        opacity: 0.8,
                      }}
                    >
                      Total solved
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{ fontWeight: 700, color: '#4F46E5', mt: -1, py: 2 }}
                    >
                      {stats.totalSolved} Problems
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Chip
                        label={`Easy ${stats.easy}`}
                        variant="outlined"
                        sx={{
                          fontWeight: 600,
                          color: DIFFICULTY_LEVELS[0].color_hex,
                          borderColor: DIFFICULTY_LEVELS[0].color_hex,
                        }}
                      />
                      <Chip
                        label={`Med ${stats.medium}`}
                        variant="outlined"
                        sx={{
                          fontWeight: 600,
                          color: DIFFICULTY_LEVELS[1].color_hex,
                          borderColor: DIFFICULTY_LEVELS[1].color_hex,
                        }}
                      />
                      <Chip
                        label={`Hard ${stats.hard}`}
                        variant="outlined"
                        sx={{
                          fontWeight: 600,
                          color: DIFFICULTY_LEVELS[2].color_hex,
                          borderColor: DIFFICULTY_LEVELS[2].color_hex,
                        }}
                      />
                    </Stack>
                  </Paper>
                </Stack>
              </Box>

              <Paper
                sx={{
                  p: 3,
                  borderRadius: 3,
                  boxShadow: '0px 4px 12px rgba(0,0,0,0.05)',
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: '#374151',
                    mb: 0,
                    opacity: 0.8,
                  }}
                >
                  Topics
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: 350,
                    borderRadius: 2,
                  }}
                >
                  <CategoryChart data={stats.categories} />
                </Box>
              </Paper>
            </Stack>
          </Box>
        </Box>
      </Container>

      {showMatching && <MatchingPopUp setShowMatching={setShowMatching} />}
    </Box>
  );
}

