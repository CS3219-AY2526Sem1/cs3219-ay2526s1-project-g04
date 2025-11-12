// 'use client';
//
// import * as React from 'react';
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   Typography,
//   CircularProgress,
//   Stack,
//   Alert,
// } from '@mui/material';
// import { useRouter } from 'next/navigation';
// import { ActiveSession } from '@/lib/collaboration-service';
// import { Question } from '@/lib/question-service';
// import { PublicUserProfile } from '@/lib/user-service';
// import { useEffect, useState } from 'react';
// import { getUserProfileById } from '@/services/userServiceApi';
// import { getQuestionById } from '@/services/questionServiceApi';
//
// interface ActiveSessionPopupProps {
//   session: ActiveSession;
//   onClose: () => void;
// }
//
// export default function ActiveSessionPopup({
//   session,
//   onClose,
// }: ActiveSessionPopupProps) {
//   const router = useRouter();
//   const [partner, setPartner] = useState<PublicUserProfile | null>(null);
//   const [question, setQuestion] = useState<Question | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState('');
//
//   useEffect(() => {
//     const fetchDetails = async () => {
//       setIsLoading(true);
//       setError('');
//       try {
//         const [partnerData, questionRes] = await Promise.all([
//           getUserProfileById(session.partnerId),
//           getQuestionById(session.questionId),
//         ]);
//
//         if (!questionRes.success) {
//           throw new Error(
//             questionRes.message || 'Failed to get question details',
//           );
//         }
//
//         setPartner(partnerData);
//         setQuestion(questionRes.data);
//       } catch (err: any) {
//         // eslint-disable-next-line no-console
//         console.error('Failed to fetch session details:', err);
//         setError(err.message || "Could not load active session's details.");
//       } finally {
//         setIsLoading(false);
//       }
//     };
//     fetchDetails();
//   }, [session.partnerId, session.questionId]);
//
//   const handleReturnToSession = () => {
//     router.push(`/collab/${session.sessionId}`);
//   };
//
//   return (
//     <Dialog open={true} onClose={onClose} maxWidth="xs" fullWidth>
//       <DialogTitle sx={{ fontWeight: 600, textAlign: 'center' }}>
//         Active Session Found
//       </DialogTitle>
//       <DialogContent>
//         {isLoading ? (
//           <Stack sx={{ my: 3, alignItems: 'center' }} spacing={2}>
//             <CircularProgress />
//             <Typography>Loading session details...</Typography>
//           </Stack>
//         ) : error ? (
//           <Alert severity="error">{error}</Alert>
//         ) : (
//           <Typography sx={{ textAlign: 'center', mt: 1 }}>
//             You are still in an active session for{' '}
//             <strong>{question?.title || 'a question'}</strong> with{' '}
//             <strong>{partner?.username || 'a peer'}</strong>.
//             <br />
//             <br />
//             Would you like to return to it?
//           </Typography>
//         )}
//       </DialogContent>
//       <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
//         <Button onClick={onClose} variant="outlined" disabled={isLoading}>
//           Stay Here
//         </Button>
//         <Button
//           onClick={handleReturnToSession}
//           variant="contained"
//           autoFocus
//           disabled={isLoading}
//         >
//           Return to Session
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// }
