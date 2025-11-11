'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DIFFICULTY_LEVELS } from '@/lib/constants/DifficultyLevels';
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
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  Avatar,
  DialogActions,
} from '@mui/material';
import { openSans } from '@/styles/fonts';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // For "Solved" status
import CancelIcon from '@mui/icons-material/Cancel';
import CategoryChart from '@/components/ui/home/dashboard/CategoryChart'; // For "Attempted" status
import MatchingPopUp from '@/components/ui/matching/MatchingPopUp';
import { getAccessToken, getUserId, getUsername } from '@/lib/utils/jwt';
import { PublicUserProfile } from '@/lib/user-service';
import { getUserProfileById, getUsersBatch } from '@/services/userServiceApi';
import { getQuestionsBatch } from '@/services/questionServiceApi';
import { Question, Topic } from '@/lib/question-service';
import { RawSession } from '@/lib/collaboration-service';
import { getMySessions } from '@/services/collaborationServiceApi';

// --- Mock Data (Replace with your API data) ---
interface MockTopic {
  slug: string;
  display: string;
  color_hex: string;
}
interface MockQuestion {
  id: string;
  title: string;
  difficulty: string;
  topics: MockTopic[]; // --- UPDATED ---
}
interface MockUser {
  id: number;
  username: string;
}

const mockSessionData = [
  {
    id: 1,
    questionId: 'q_math_001',
    endedAt: '2025-11-10T10:05:20.000Z',
    solved: true,
    UserAId: 1,
    UserBId: 102,
  },
  {
    id: 2,
    questionId: 'q_chem_045',
    endedAt: '2025-11-09T11:00:00Z',
    solved: true,
    UserAId: 101,
    UserBId: 103,
  },
  {
    id: 3,
    questionId: 'q_algo_002',
    endedAt: '2025-11-09T14:00:00Z',
    solved: false,
    UserAId: 104,
    UserBId: 101,
  },
  {
    id: 4,
    questionId: 'q_sys_001',
    endedAt: '2025-11-08T16:00:00Z',
    solved: true,
    UserAId: 101,
    UserBId: 102,
  },
  {
    id: 5,
    questionId: 'q_math_001',
    endedAt: '2025-11-07T12:00:00Z',
    solved: true,
    UserAId: 103,
    UserBId: 101,
  },
  {
    id: 6,
    questionId: 'q_chem_045',
    endedAt: '2025-11-06T10:00:00Z',
    solved: true,
    UserAId: 101,
    UserBId: 104,
  },
  {
    id: 7,
    questionId: 'q_algo_002',
    endedAt: '2025-11-05T11:00:00Z',
    solved: true,
    UserAId: 102,
    UserBId: 101,
  },

  // This one is active and will be filtered out
  {
    id: 12,
    questionId: 'q_sys_001',
    endedAt: null,
    solved: false,
    UserAId: 101,
    UserBId: 104,
  },
];
const mockQuestionDatabase: Record<string, MockQuestion> = {
  q_math_001: {
    id: 'q_math_001',
    title: 'Two Sum',
    difficulty: 'Easy',
    topics: [
      { slug: 'array', display: 'Array', color_hex: '#3b82f6' },
      { slug: 'hash-table', display: 'Hash Table', color_hex: '#10b981' },
    ],
  },
  q_chem_045: {
    id: 'q_chem_045',
    title: 'Contains Duplicate',
    difficulty: 'Easy',
    topics: [{ slug: 'array', display: 'Array', color_hex: '#3b82f6' }],
  },
  q_algo_002: {
    id: 'q_algo_002',
    title: 'Add Two Numbers',
    difficulty: 'Medium',
    topics: [
      { slug: 'linked-list', display: 'Linked List', color_hex: '#ec4899' },
      { slug: 'math', display: 'Math', color_hex: '#f59e0b' },
    ],
  },
  q_sys_001: {
    id: 'q_sys_001',
    title: 'Median of 2 Sorted Arrays',
    difficulty: 'Hard',
    topics: [
      { slug: 'array', display: 'Array', color_hex: '#3b82f6' },
      { slug: 'binary-search', display: 'Binary Search', color_hex: '#8b5cf6' },
    ],
  },
};

const mockUserDatabase: Record<number, MockUser> = {
  1: { id: 1, username: 'kailash201' },
  102: { id: 102, username: 'flexibo' },
  103: { id: 103, username: 'ylchin' },
};
// --- End of Mock Data ---

const fakeFetch = <T,>(
  db: Record<string | number, T>,
  ids: (string | number)[],
): Promise<T[]> => {
  return new Promise<T[]>((resolve) => {
    setTimeout(() => {
      const results = ids.map((id) => db[id]).filter(Boolean);
      resolve(results);
    }, 200);
  });
};

// Type definitions
interface EnrichedSession {
  id: number;
  endedAt: string;
  isSolved: boolean;
  question: {
    title: string;
    difficulty: string;
    topics: Topic[];
  };
  peer: {
    id: number;
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
  const [showSessionBeingCreated, setShowSessionBeingCreated] =
    React.useState(true);
  const [history, setHistory] = useState<EnrichedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const [selectedPeer, setSelectedPeer] = useState<
    EnrichedSession['peer'] | null
  >(null);
  const [isPeerProfileLoading, setIsPeerProfileLoading] = useState(false);
  const [peerProfile, setPeerProfile] = useState<PublicUserProfile | null>(
    null,
  );
  const [peerProfileError, setPeerProfileError] = useState('');

  // 1. Data Fetching and Orchestration
  useEffect(() => {
    const loadDashboardData = async () => {
      let currentUserId: number | null = null;
      // const token = localStorage.getItem('accessToken');
      const token = getAccessToken();
      try {
        console.log(token);
        currentUserId = getUserId();
      } catch (error) {
        console.error('Invalid token:', error);
        router.push('/accounts/login');
        return;
      }

      try {
        // const rawSessions: RawSession[] = await getMySessions();
        const rawSessions: RawSession[] = mockSessionData;

        const finishedSessions = rawSessions.filter((s) => s.endedAt !== null);

        if (finishedSessions.length === 0) {
          setHistory([]);
          setIsLoading(false);
          return;
        }

        const questionIds = [
          ...new Set(finishedSessions.map((s) => s.questionId)),
        ];
        const peerIds = [
          ...new Set(
            finishedSessions
              .flatMap((s) => [s.UserAId, s.UserBId]) // Get all participant IDs
              .filter((id) => id !== currentUserId), // Filter out the current user
          ),
        ];

        // --- ACTUAL API CALLS ----
        // const [questionRes, peerData] = await Promise.all([
        //   questionIds.length > 0
        //     ? getQuestionsBatch(questionIds)
        //     : Promise.resolve({ success: true, data: { items: [] } }),
        //   peerIds.length > 0 ? getUsersBatch(peerIds) : Promise.resolve([]),
        // ]);
        // if (!questionRes.success) {
        //   throw new Error('Failed to fetch questions');
        // }
        // const questionData: Question[] = questionRes.data.items;
        // --- END ----

        const [questionData, peerData] = await Promise.all([
          fakeFetch(mockQuestionDatabase, questionIds),
          fakeFetch(mockUserDatabase, peerIds),
        ]);

        const questionMap = new Map(questionData.map((q) => [q.id, q]));
        const peerMap = new Map(peerData.map((p) => [p.id, p]));

        // --- UPDATED: "Stitch" the data together, including isSolved ---
        const enrichedSessions = finishedSessions.map((session) => {
          const peerId =
            session.UserAId === currentUserId
              ? session.UserBId
              : session.UserAId;
          const peer = peerMap.get(peerId!) || {
            id: -1,
            username: '[deleted_user]',
          };
          const question = questionMap.get(session.questionId) || {
            title: 'Unknown Question',
            difficulty: 'Easy',
            topics: [],
          };
          return {
            id: session.id,
            endedAt: session.endedAt!,
            isSolved: session.solved,
            question: {
              title: question.title,
              difficulty: question.difficulty,
              topics: question.topics,
            },
            peer: { id: peer.id, username: peer.username },
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

  useEffect(() => {
    if (!selectedPeer || selectedPeer.id === -1) return; // Don't fetch for deleted user
    const fetchPeerProfile = async () => {
      setIsPeerProfileLoading(true);
      setPeerProfileError('');
      try {
        const data = await getUserProfileById(selectedPeer.id);
        setPeerProfile(data);
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch peer profile:', err);
        setPeerProfileError(err.message || "Could not load peer's profile.");
      } finally {
        setIsPeerProfileLoading(false);
      }
    };
    fetchPeerProfile();
  }, [selectedPeer]);

  // 2. Frontend Analytics Calculation
  const stats: AnalyticsStats = useMemo(() => {
    const solvedSessions = history.filter((session) => session.isSolved);

    const totalSolved = solvedSessions.length;
    let easy = 0;
    let medium = 0;
    let hard = 0;
    const categories: Record<string, number> = {};

    for (const session of solvedSessions) {
      const difficulty = session.question.difficulty.toLowerCase();
      if (difficulty === 'easy') easy++;
      else if (difficulty === 'medium') medium++;
      else if (difficulty === 'hard') hard++;

      for (const topic of session.question.topics) {
        categories[topic.display] = (categories[topic.display] || 0) + 1;
      }
    }

    console.log('Calculated Solved Categories:', categories);

    return { totalSolved, easy, medium, hard, categories };
  }, [history]);

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
  const handleClosePeerProfile = () => {
    setSelectedPeer(null);
    setPeerProfile(null);
    setPeerProfileError('');
  };
  return (
    <Box
      sx={{
        pt: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      {/* Main Content */}
      <Container maxWidth="xl">
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
          Welcome back, {getUsername()}!
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
                  boxShadow: '0px 4px 12px rgba(0,0,0,0.2)',
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
                              {new Date(row.endedAt).toLocaleDateString()}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: '#6B7280' }}
                            >
                              {new Date(row.endedAt).toLocaleTimeString([], {
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
                                {row.question.topics.map((topic) => (
                                  <Chip
                                    key={topic.slug}
                                    label={topic.display}
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                      width: 'fit-content',
                                      fontWeight: 500,
                                      fontSize: '0.7rem',
                                      color: topic.color_hex,
                                      borderColor: `${topic.color_hex}20`,
                                      height: '20px',
                                    }}
                                  />
                                ))}
                              </Stack>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ color: '#6B7280' }}>
                            <Link
                              component="button"
                              variant="body2"
                              onClick={() => setSelectedPeer(row.peer)}
                              sx={{
                                color: '#6B7280',
                                textDecoration: 'underline',
                                cursor:
                                  row.peer.id === -1 ? 'default' : 'pointer',
                                border: 'none',
                                background: 'none',
                                padding: 0,
                                font: 'inherit',
                                textAlign: 'left',
                              }}
                              disabled={row.peer.id === -1}
                            >
                              {row.peer.username}
                            </Link>
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
                      boxShadow: '0px 4px 12px rgba(0,0,0,0.2)',
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
                  boxShadow: '0px 4px 12px rgba(0,0,0,0.2)',
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
      <Dialog
        open={!!selectedPeer}
        onClose={handleClosePeerProfile}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 0, fontWeight: 'bold' }}>
          User Profile
        </DialogTitle>
        <DialogContent sx={{ pt: 2, textAlign: 'center' }}>
          {isPeerProfileLoading ? (
            <CircularProgress sx={{ my: 4 }} />
          ) : peerProfileError ? (
            <Alert severity="error">{peerProfileError}</Alert>
          ) : peerProfile ? (
            <Stack spacing={2} alignItems="center" sx={{ mt: 1 }}>
              <Avatar
                src={peerProfile.profilePictureUrl ?? undefined}
                alt={peerProfile.username}
                sx={{ width: 100, height: 100, mb: 1 }}
              />
              <Typography variant="h5" fontWeight={600}>
                {peerProfile.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Member since:{' '}
                {new Date(peerProfile.createdAt).toLocaleDateString()}
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  backgroundColor: '#f9fafb',
                  width: '100%',
                  borderRadius: 2,
                  maxHeight: '150px',
                  overflowY: 'auto',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}
                >
                  {peerProfile.bio || <i>No bio provided.</i>}
                </Typography>
              </Paper>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button onClick={handleClosePeerProfile} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
