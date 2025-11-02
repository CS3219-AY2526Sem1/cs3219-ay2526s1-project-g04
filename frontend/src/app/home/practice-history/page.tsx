'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { DIFFICULTY_LEVELS } from '@/lib/constants/difficultyLevels';
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
  Pagination, // Import Pagination
} from '@mui/material';
import { openSans } from '@/styles/fonts';
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Import Back Icon
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// --- MOCK DATABASES (Expanded for pagination) ---
const mockSessionData = [
  { sessionId: 1, questionId: 'q1', userIds: [1, 2], createdAt: '2025-09-07T10:00:00Z', isSolved: true },
  { sessionId: 2, questionId: 'q2', userIds: [1, 3], createdAt: '2025-09-07T11:00:00Z', isSolved: true },
  { sessionId: 3, questionId: 'q3', userIds: [1, 4], createdAt: '2025-09-06T14:00:00Z', isSolved: false },
  { sessionId: 4, questionId: 'q4', userIds: [1, 2], createdAt: '2025-09-05T16:00:00Z', isSolved: true },
  { sessionId: 5, questionId: 'q1', userIds: [1, 3], createdAt: '2025-09-04T12:00:00Z', isSolved: true },
  { sessionId: 6, questionId: 'q2', userIds: [1, 4], createdAt: '2025-09-03T10:00:00Z', isSolved: true },
  { sessionId: 7, questionId: 'q3', userIds: [1, 2], createdAt: '2025-09-02T11:00:00Z', isSolved: true },
  { sessionId: 8, questionId: 'q4', userIds: [1, 3], createdAt: '2025-09-01T14:00:00Z', isSolved: false },
  { sessionId: 9, questionId: 'q1', userIds: [1, 4], createdAt: '2025-08-31T16:00:00Z', isSolved: true },
  { sessionId: 10, questionId: 'q2', userIds: [1, 2], createdAt: '2025-08-30T12:00:00Z', isSolved: true },
  { sessionId: 11, questionId: 'q3', userIds: [1, 3], createdAt: '2025-08-29T12:00:00Z', isSolved: true },
];
const mockQuestionDatabase: Record<string, any> = {
  q1: { id: 'q1', title: 'Two Sum', difficulty: 'Easy', topics: ['Array', 'Hash Table'] },
  q2: { id: 'q2', title: 'Contains Duplicate', difficulty: 'Easy', topics: ['Array'] },
  q3: { id: 'q3', title: 'Add Two Numbers', difficulty: 'Medium', topics: ['Linked List', 'Math'] },
  q4: { id: 'q4', title: 'Median of 2 Sorted Arrays', difficulty: 'Hard', topics: ['Array', 'Binary Search'] },
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
      const results = ids.map(id => db[id]).filter(Boolean);
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
  isSolved: boolean;
}
interface EnrichedSession {
  id: number;
  createdAt: string;
  isSolved: boolean;
  question: {
    title: string;
    difficulty: string;
    topics: string[];
  };
  peer: {
    username: string;
  };
}

// Helper for styling difficulty chips
const getDifficultyHex = (difficultyName: string) => {
  const level = DIFFICULTY_LEVELS.find(
      (l) => l.name.toLowerCase() === difficultyName.toLowerCase(),
  );
  return level ? level.color_hex : '#808080'; // Default gray
};

const ITEMS_PER_PAGE = 10; // Define how many items to show per page

export default function PracticeHistoryPage() {
  const [user, setUser] = useState<UserJwtPayload | null>(null);
  const [history, setHistory] = useState<EnrichedSession[]>([]); // Will hold ALL sessions
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // --- NEW: State for pagination ---
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);

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
        // In a real app, you would fetch paginated data here.
        // For this mock, we fetch everything and paginate on the frontend.
        const rawSessions: RawSession[] = mockSessionData;

        const questionIds = [...new Set(rawSessions.map(s => s.questionId))];
        const peerIds = [...new Set(rawSessions.flatMap(s => s.userIds).filter(id => id !== currentUserId))];

        const [questionData, peerData] = await Promise.all([
          fakeFetch(mockQuestionDatabase, questionIds),
          fakeFetch(mockUserDatabase, peerIds),
        ]);

        const questionMap = new Map(questionData.map(q => [q.id, q]));
        const peerMap = new Map(peerData.map(p => [p.id, p]));

        const enrichedSessions = rawSessions.map(session => {
          const peerId = session.userIds.find(id => id !== currentUserId);
          const peer = peerMap.get(peerId!) || { username: 'Unknown' };
          const question = questionMap.get(session.questionId) || { title: 'Unknown Question', difficulty: 'Easy', topics: [] };
          return {
            id: session.sessionId,
            createdAt: session.createdAt,
            isSolved: session.isSolved,
            question: {
              title: question.title,
              difficulty: question.difficulty,
              topics: question.topics,
            },
            peer: { username: peer.username },
          };
        });

        // Set the total history and page count
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

  // 2. Memoized Pagination Logic
  const paginatedHistory = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return history.slice(start, end);
  }, [history, page]);

  // 3. Page Change Handler
  const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  // 4. Loading State
  if (isLoading) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F9FAFB' }}>
          <CircularProgress />
        </Box>
    );
  }

  // 5. Render Page
  return (
      <Box sx={{ pt: 5, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F9FAFB' }}>
        <Container maxWidth="xl" sx={{ py: 4 }}>

          {/* --- Back Button --- */}
          <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/home/dashboard')}
              sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>

          {/* Practice History */}
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: openSans.style.fontFamily, color: '#374151', opacity: 0.7 }}>
                Practice History
              </Typography>
            </Stack>
            <TableContainer>
              <Table sx={{ '& .MuiTableCell-root': { borderBottom: 'none', py: 1.5 } }}>
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-root': { color: '#6B7280', fontWeight: 600 } }}>
                    <TableCell>Date Attempted</TableCell>
                    <TableCell>Problem</TableCell>
                    <TableCell>Peer</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* --- RENDER PAGINATED HISTORY --- */}
                  {paginatedHistory.map((row) => (
                      <TableRow key={row.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#F9FAFB' } }}>
                        <TableCell sx={{ fontWeight: 500, color: '#374151' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {new Date(row.createdAt).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6B7280' }}>
                            {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={1}>
                            <Typography sx={{ fontWeight: 600, color: '#374151' }}>
                              {row.question.title}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                              <Chip
                                  label={row.question.difficulty}
                                  variant="outlined"
                                  size="small"
                                  sx={{
                                    width: 'fit-content', fontWeight: 600, fontSize: '0.7rem',
                                    color: getDifficultyHex(row.question.difficulty),
                                    borderColor: getDifficultyHex(row.question.difficulty),
                                    height: '20px',
                                  }}
                              />
                              {row.question.topics.map((topic) => (
                                  <Chip
                                      key={topic}
                                      label={topic}
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
      </Box>
  );
}
