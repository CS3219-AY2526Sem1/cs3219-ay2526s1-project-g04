// 'use client';

// import React, { useEffect, useState } from 'react';
// import { useCollab } from '../CollabProvider';
// import { Stack, Typography, Box } from '@mui/material';

// interface ChatMessage {
//   id: string;
//   text: string;
//   user: string;
//   timestamp: number;
// }

// export const MessageDialogs = () => {
//   const { messages, userId } = useCollab();
//   const [chatList, setChatList] = useState<ChatMessage[]>([]);

//   useEffect(() => {
//     if (!messages) return;

//     const update = () => setChatList(messages.toArray());
//     update(); // initial load
//     messages.observe(update);

//     return () => messages.unobserve(update);
//   }, [messages]);

//   return (
//     <Stack spacing={2} className="flex-1 overflow-y-auto p-2">
//       {chatList.map((msg, idx) => {
//         const isOwn = msg.user === userId;

//         return (
//           <Box
//             key={msg.id ?? idx}
//             display="flex"
//             flexDirection="column"
//             alignItems={isOwn ? 'flex-end' : 'flex-start'}
//           >
//             {/* Message bubble */}
//             <Box
//               sx={{
//                 px: 2,
//                 py: 1.2,
//                 borderRadius: 3,
//                 maxWidth: '70%',
//                 bgcolor: isOwn ? '#8b5cf7' : '#f1f1f1',
//                 color: isOwn ? 'white' : '#222',
//               }}
//             >
//               <Typography
//                 variant="body2"
//                 sx={{
//                   fontWeight: isOwn ? 400 : 500,
//                   opacity: 0.9,
//                 }}
//               >
//                 {msg.text}
//               </Typography>
//             </Box>

//             {/* Timestamp below bubble */}
//             <Typography
//               variant="caption"
//               sx={{
//                 textAlign: isOwn ? 'right' : 'left',
//                 color: '#797979ff',
//                 fontSize: '0.7rem',
//                 mt: 0.3,
//                 ml: isOwn ? 0 : 1,
//                 mr: isOwn ? 1 : 0,
//               }}
//             >
//               {msg.timestamp
//                 ? new Date(msg.timestamp).toLocaleTimeString([], {
//                     hour: '2-digit',
//                     minute: '2-digit',
//                   })
//                 : ''}
//             </Typography>
//           </Box>
//         );
//       })}
//     </Stack>
//   );
// };
