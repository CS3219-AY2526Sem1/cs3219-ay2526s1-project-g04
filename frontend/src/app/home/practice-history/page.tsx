'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { DIFFICULTY_LEVELS } from '@/lib/constants/DifficultyLevels';
import {
  Box,
  Button,
  Chip,
  Container,
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
  Pagination,
  DialogTitle,
  DialogContent,
  Alert,
  Avatar,
  DialogActions,
  Dialog,
} from '@mui/material';
import { openSans } from '@/styles/fonts';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { getAccessToken, getUserId } from '@/lib/utils/jwt';
import { PublicUserProfile } from '@/lib/user-service';
import { getUserProfileById, getUsersBatch } from '@/services/userServiceApi';
import { getQuestionsBatch } from '@/services/questionServiceApi';
import {Question, Topic} from '@/lib/question-service';
import {RawSession} from "@/lib/collaboration-service";
import {getMySessions} from "@/services/collaborationServiceApi";

// --- MOCK DATABASES (Expanded for pagination) ---
// interface MockTopic {
//   slug: string;
//   display: string;
//   color_hex: string;
// }
// interface MockQuestion {
//   id: string;
//   title: string;
//   difficulty: string;
//   topics: MockTopic[]; // --- UPDATED ---
// }
// interface MockUser {
//   id: number;
//   username: string;
// }
//
// const mockSessionData = [
//   {
//     id: 1,
//     questionId: 'q_math_001',
//     endedAt: '2025-11-10T10:05:20.000Z',
//     solved: true,
//     UserAId: 1,
//     UserBId: 2,
//   },
//   {
//     id: 2,
//     questionId: 'q_chem_045',
//     endedAt: '2025-11-09T11:00:00Z',
//     solved: true,
//     UserAId: 101,
//     UserBId: 103,
//   },
//   {
//     id: 3,
//     questionId: 'q_algo_002',
//     endedAt: '2025-11-09T14:00:00Z',
//     solved: false,
//     UserAId: 104,
//     UserBId: 101,
//   },
//   {
//     id: 4,
//     questionId: 'q_sys_001',
//     endedAt: '2025-11-08T16:00:00Z',
//     solved: true,
//     UserAId: 101,
//     UserBId: 102,
//   },
//   {
//     id: 5,
//     questionId: 'q_math_001',
//     endedAt: '2025-11-07T12:00:00Z',
//     solved: true,
//     UserAId: 103,
//     UserBId: 101,
//   },
//   {
//     id: 6,
//     questionId: 'q_chem_045',
//     endedAt: '2025-11-06T10:00:00Z',
//     solved: true,
//     UserAId: 101,
//     UserBId: 104,
//   },
//   {
//     id: 7,
//     questionId: 'q_algo_002',
//     endedAt: '2025-11-05T11:00:00Z',
//     solved: true,
//     UserAId: 102,
//     UserBId: 101,
//   },
//   {
//     id: 8,
//     questionId: 'q_sys_001',
//     endedAt: '2025-11-04T14:00:00Z',
//     solved: false,
//     UserAId: 101,
//     UserBId: 103,
//   },
//   {
//     id: 9,
//     questionId: 'q_math_001',
//     endedAt: '2025-11-03T16:00:00Z',
//     solved: true,
//     UserAId: 104,
//     UserBId: 101,
//   },
//   {
//     id: 10,
//     questionId: 'q_chem_045',
//     endedAt: '2025-11-02T12:00:00Z',
//     solved: true,
//     UserAId: 101,
//     UserBId: 102,
//   },
//   {
//     id: 11,
//     questionId: 'q_algo_002',
//     endedAt: '2025-11-01T12:00:00Z',
//     solved: true,
//     UserAId: 103,
//     UserBId: 101,
//   },
//   // This one is active and will be filtered out
//   {
//     id: 12,
//     questionId: 'q_sys_001',
//     endedAt: null,
//     solved: false,
//     UserAId: 101,
//     UserBId: 104,
//   },
// ];
// const mockQuestionDatabase: Record<string, MockQuestion> = {
//   q_math_001: {
//     id: 'q_math_001',
//     title: 'Two Sum',
//     difficulty: 'Easy',
//     topics: [
//       { slug: 'array', display: 'Array', color_hex: '#3b82f6' },
//       { slug: 'hash-table', display: 'Hash Table', color_hex: '#10b981' },
//     ],
//   },
//   q_chem_045: {
//     id: 'q_chem_045',
//     title: 'Contains Duplicate',
//     difficulty: 'Easy',
//     topics: [{ slug: 'array', display: 'Array', color_hex: '#3b82f6' }],
//   },
//   q_algo_002: {
//     id: 'q_algo_002',
//     title: 'Add Two Numbers',
//     difficulty: 'Medium',
//     topics: [
//       { slug: 'linked-list', display: 'Linked List', color_hex: '#ec4899' },
//       { slug: 'math', display: 'Math', color_hex: '#f59e0b' },
//     ],
//   },
//   q_sys_001: {
//     id: 'q_sys_001',
//     title: 'Median of 2 Sorted Arrays',
//     difficulty: 'Hard',
//     topics: [
//       { slug: 'array', display: 'Array', color_hex: '#3b82f6' },
//       { slug: 'binary-search', display: 'Binary Search', color_hex: '#8b5cf6' },
//     ],
//   },
// };
//
// const mockUserDatabase: Record<number, MockUser> = {
//   1: { id: 1, username: 'yixinhuang' },
//   2: { id: 2, username: 'flexibo' },
//   103: { id: 103, username: 'ylchin' },
// };
// // --- End of Mock Data ---
//
// // Helper to simulate API calls
// const fakeFetch = <T,>(
//   db: Record<string | number, T>,
//   ids: (string | number)[],
// ): Promise<T[]> => {
//   return new Promise<T[]>((resolve) => {
//     setTimeout(() => {
//       const results = ids.map((id) => db[id]).filter(Boolean);
//       resolve(results);
//     }, 200);
//   });
// };

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

const getDifficultyHex = (difficultyName: string) => {
  const level = DIFFICULTY_LEVELS.find(
    (l) => l.name.toLowerCase() === difficultyName.toLowerCase(),
  );
  return level ? level.color_hex : '#808080';
};

const ITEMS_PER_PAGE = 10;

export default function PracticeHistoryPage() {
  const [history, setHistory] = useState<EnrichedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);

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
      const token = getAccessToken();
      try {
        currentUserId = getUserId();
      } catch (error) {
        console.error('Invalid token:', error);
        router.push('/accounts/login');
        return;
      }

      try {
        const rawSessions: RawSession[] = await getMySessions();
        // const rawSessions: RawSession[] = mockSessionData;
        const finishedSessions = rawSessions.filter((s) => s.endedAt !== null);
        const questionIds = [...new Set(rawSessions.map((s) => s.questionId))];
        const peerIds = [
          ...new Set(
            finishedSessions
              .flatMap((s) => [s.UserAId, s.UserBId])
              .filter((id) => id !== currentUserId),
          ),
        ];

        // --- ACTUAL API CALLS ----
        const [questionRes, peerData] = await Promise.all([
          questionIds.length > 0 ? getQuestionsBatch(questionIds) : Promise.resolve({ success: true, data: { items: [] } }),
          peerIds.length > 0 ? getUsersBatch(peerIds) : Promise.resolve([]),
        ]);
        if (!questionRes.success) {
          throw new Error("Failed to fetch questions");
        }
        const questionData: Question[] = questionRes.data.items;
        // --- END ----

        // const [questionData, peerData] = await Promise.all([
        //   fakeFetch(mockQuestionDatabase, questionIds),
        //   fakeFetch(mockUserDatabase, peerIds),
        // ]);

        const questionMap = new Map(questionData.map((q) => [q.id, q]));
        const peerMap = new Map(peerData.map((p) => [p.id, p]));

        const enrichedSessions = rawSessions.map((session) => {
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
        setPageCount(Math.ceil(enrichedSessions.length / ITEMS_PER_PAGE));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, [router]);

  useEffect(() => {
    if (!selectedPeer || selectedPeer.id === -1) return; // don't fetch for deleted user
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

  // 2. Memoized Pagination Logic
  const paginatedHistory = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return history.slice(start, end);
  }, [history, page]);

  // 3. Page Change Handler
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  // 4. Loading State
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

  // 5. Render Page
  return (
    <Box
      sx={{
        pt: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <Container maxWidth="xl" sx={{ py: 0 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            fontFamily: openSans.style.fontFamily,
            color: '#374151',
            opacity: 0.7,
            pb: 3,
          }}
        >
          Practice History
        </Typography>

        {/* Practice History */}
        <Paper
          sx={{
            p: 0,
            borderRadius: 3,
            boxShadow: '0px 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          ></Stack>
          <TableContainer>
            <Table
              sx={{ '& .MuiTableCell-root': { borderBottom: 'none', py: 1.5 } }}
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
                  <TableCell>Date Attempted</TableCell>
                  <TableCell>Problem</TableCell>
                  <TableCell>Peer</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* --- RENDER PAGINATED HISTORY --- */}
                {paginatedHistory.map((row) => (
                  <TableRow
                    key={row.id}
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: '#F9FAFB' },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500, color: '#374151' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {new Date(row.endedAt).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6B7280' }}>
                        {new Date(row.endedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={1}>
                        <Typography sx={{ fontWeight: 600, color: '#374151' }}>
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
                              color: getDifficultyHex(row.question.difficulty),
                              borderColor: getDifficultyHex(
                                row.question.difficulty,
                              ),
                              height: '20px',
                            }}
                          />
                          {row.question.topics.map((topic) => (
                            <Chip
                              key={topic.slug} // Use slug as key
                              label={topic.display} // Use display for label
                              size="small"
                              sx={{
                                width: 'fit-content',
                                fontWeight: 500,
                                fontSize: '0.7rem',
                                color: '#5A6372',
                                backgroundColor: '#F3F4F6',
                                border: 'none',
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
                          // textDecoration: 'underline',
                          cursor: row.peer.id === -1 ? 'default' : 'pointer',
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

          {/* --- ADDED: Pagination Controls --- */}
          <Stack spacing={2} sx={{ mt: 3, alignItems: 'center' }}>
            <Pagination
              count={pageCount}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Stack>
        </Paper>
      </Container>
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
