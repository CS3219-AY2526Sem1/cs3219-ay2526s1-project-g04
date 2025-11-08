// 'use client';

// import {
//   Avatar,
//   Card,
//   CardContent,
//   CardHeader,
//   Stack,
//   Typography,
//   Box,
// } from '@mui/material';
// import '@/styles/globals.css';
// import { UserInput } from './messaging/userInput';
// import { MessageDialogs } from './messaging/messageDialog';
// import { CollabProvider, useCollab } from './CollabProvider';
// import React from 'react';
// import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

// // 👇 awareness state type
// interface AwarenessUser {
//   id: string;
//   color?: string;
//   name?: string;
// }

// interface AwarenessState {
//   user?: AwarenessUser;
//   cursor?: { x: number; y: number };
// }

// const ChatHeader = () => {
//   const { awareness, userId } = useCollab();
//   const [otherUser, setOtherUser] = React.useState<AwarenessUser | null>(null);

//   React.useEffect(() => {
//     if (!awareness) return;

//     const update = () => {
//       const states = Array.from(
//         awareness.getStates().values(),
//       ) as AwarenessState[];
//       const others = states
//         .map((s) => s.user)
//         .filter((u): u is AwarenessUser => !!u && u.id !== userId);
//       setOtherUser(others[0] || null);
//     };

//     update();
//     awareness.on('change', update);
//     return () => awareness.off('change', update);
//   }, [awareness, userId]);

//   return (
//     <CardHeader
//       className="py-2 px-3 h-fit border-b border-[#e0e0e0]"
//       title={
//         <Stack direction="row" alignItems="center" spacing={2}>
//           <Avatar
//             sx={{
//               bgcolor: '#ded0ff',
//               color: '#8b5cf7',
//             }}
//           >
//             <PersonOutlineIcon sx={{ fontSize: 30 }} />
//           </Avatar>
//           <Typography className="font-semibold">
//             {otherUser?.id
//               ? `User-${otherUser.id}`
//               : 'Waiting for collaborator...'}
//           </Typography>
//         </Stack>
//       }
//     />
//   );
// };

// export const MessageBoard = () => {
//   return (
//     <CollabProvider>
//       <Card
//         className="flex flex-col w-full h-full shadow-none"
//         sx={{
//           display: 'flex',
//           flexDirection: 'column',
//           height: '100%',
//           overflow: 'hidden',
//         }}
//       >
//         <ChatHeader />

//         {/* Scrollable content area */}
//         <CardContent
//           sx={{
//             flex: 1,
//             display: 'flex',
//             flexDirection: 'column',
//             overflow: 'hidden',
//             p: 0,
//           }}
//         >
//           <Box
//             sx={{
//               flex: 1,
//               overflowY: 'auto',
//               px: 2,
//               py: 1,
//             }}
//           >
//             <MessageDialogs />
//           </Box>

//           {/* Fixed input bar at bottom */}
//           <Box>
//             <UserInput />
//           </Box>
//         </CardContent>
//       </Card>
//     </CollabProvider>
//   );
// };
