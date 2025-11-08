// 'use client';

// import React, { useRef, useEffect, useState, useCallback } from 'react';
// import { Card, CardContent, IconButton, Box } from '@mui/material';
// import CreateIcon from '@mui/icons-material/Create';
// import KitchenIcon from '@mui/icons-material/Kitchen';
// import { useCollab } from './CollabProvider';

// interface Point {
//   x: number;
//   y: number;
// }

// interface Stroke {
//   id: string;
//   userId: string;
//   color: string;
//   size: number;
//   points: Point[];
// }

// export const DrawingBoard = () => {
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//   const { strokes, userId } = useCollab();

//   const [isDrawing, setIsDrawing] = useState(false);
//   const [isErasing, setIsErasing] = useState(false);
//   const [isErasingDrag, setIsErasingDrag] = useState(false);
//   const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
//   const penSize = 4;

//   const userColor = '#7E57C2';
//   const otherColor = '#2196F3';

//   const getMousePos = useCallback(
//     (e: React.MouseEvent, canvas: HTMLCanvasElement): Point => {
//       const rect = canvas.getBoundingClientRect();
//       return { x: e.clientX - rect.left, y: e.clientY - rect.top };
//     },
//     [],
//   );

//   const drawStroke = useCallback(
//     (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
//       if (!stroke.points || stroke.points.length < 2) return;
//       ctx.strokeStyle = stroke.userId === userId ? userColor : otherColor;
//       ctx.lineWidth = stroke.size;
//       ctx.beginPath();
//       const pts = stroke.points;
//       ctx.moveTo(pts[0].x, pts[0].y);
//       for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
//       ctx.stroke();
//     },
//     [userId],
//   );

//   const redrawAll = useCallback(
//     (ctx: CanvasRenderingContext2D) => {
//       ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
//       if (!strokes) return;
//       ctx.lineCap = 'round';
//       ctx.lineJoin = 'round';
//       const all = strokes.toArray();
//       for (const s of all) drawStroke(ctx, s);
//     },
//     [strokes, drawStroke],
//   );

//   const resizeCanvas = useCallback(
//     (canvas: HTMLCanvasElement) => {
//       const rect = canvas.getBoundingClientRect();
//       const dpr = window.devicePixelRatio || 1;
//       canvas.width = rect.width * dpr;
//       canvas.height = rect.height * dpr;
//       const ctx = canvas.getContext('2d');
//       if (!ctx) return;
//       ctx.scale(dpr, dpr);
//       ctx.translate(0.5, 0.5);
//       redrawAll(ctx);
//     },
//     [redrawAll],
//   );

//   // observe shared strokes from Yjs
//   useEffect(() => {
//     if (!strokes || !canvasRef.current) return;
//     const ctx = canvasRef.current.getContext('2d');
//     if (!ctx) return;

//     const render = () => redrawAll(ctx);
//     render();

//     const observer = () => requestAnimationFrame(render);
//     strokes.observe(observer);
//     return () => strokes.unobserve(observer);
//   }, [strokes, redrawAll]);

//   // 📏 Eraser helpers
//   const distanceToSegment = useCallback(
//     (p: Point, a: Point, b: Point): number => {
//       const A = p.x - a.x;
//       const B = p.y - a.y;
//       const C = b.x - a.x;
//       const D = b.y - a.y;

//       const dot = A * C + B * D;
//       const lenSq = C * C + D * D;
//       const param = lenSq ? dot / lenSq : -1;

//       let xx: number, yy: number;
//       if (param < 0) {
//         xx = a.x;
//         yy = a.y;
//       } else if (param > 1) {
//         xx = b.x;
//         yy = b.y;
//       } else {
//         xx = a.x + param * C;
//         yy = a.y + param * D;
//       }

//       return Math.hypot(p.x - xx, p.y - yy);
//     },
//     [],
//   );

//   const findStrokeAtPoint = useCallback(
//     (x: number, y: number, all: Stroke[]): number | null => {
//       const threshold = 6;
//       for (let i = all.length - 1; i >= 0; i--) {
//         const pts = all[i].points;
//         for (let j = 0; j < pts.length - 1; j++) {
//           if (distanceToSegment({ x, y }, pts[j], pts[j + 1]) <= threshold) {
//             return i;
//           }
//         }
//       }
//       return null;
//     },
//     [distanceToSegment],
//   );

//   const eraseAt = useCallback(
//     (x: number, y: number) => {
//       if (!strokes || !canvasRef.current) return;
//       const all = strokes.toArray();
//       const idx = findStrokeAtPoint(x, y, all);
//       if (idx !== null) {
//         strokes.delete(idx, 1);
//         const ctx = canvasRef.current.getContext('2d');
//         if (ctx) redrawAll(ctx);
//       }
//     },
//     [strokes, findStrokeAtPoint, redrawAll],
//   );

//   const handleMouseDown = (e: React.MouseEvent) => {
//     if (!canvasRef.current) return;
//     const { x, y } = getMousePos(e, canvasRef.current);

//     if (isErasing) {
//       setIsErasingDrag(true);
//       eraseAt(x, y);
//       return;
//     }

//     const newStroke: Stroke = {
//       id: crypto.randomUUID(),
//       userId,
//       color: userColor,
//       size: penSize,
//       points: [{ x, y }],
//     };
//     setIsDrawing(true);
//     setCurrentStroke(newStroke);
//   };

//   const handleMouseMove = (e: React.MouseEvent) => {
//     if (!canvasRef.current) return;
//     const { x, y } = getMousePos(e, canvasRef.current);

//     if (isErasing && isErasingDrag) {
//       eraseAt(x, y);
//       return;
//     }

//     if (isDrawing && currentStroke) {
//       const updated: Stroke = {
//         ...currentStroke,
//         points: [...currentStroke.points, { x, y }],
//       };
//       setCurrentStroke(updated);

//       const ctx = canvasRef.current.getContext('2d');
//       if (ctx) drawStroke(ctx, updated);
//     }
//   };

//   const handleMouseUp = () => {
//     if (isErasing) {
//       setIsErasingDrag(false);
//       return;
//     }
//     if (!isDrawing) return;
//     setIsDrawing(false);
//     if (currentStroke && currentStroke.points.length > 1 && strokes) {
//       strokes.push([currentStroke]);
//     }
//     setCurrentStroke(null);
//   };

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     resizeCanvas(canvas);
//     const handleResize = () => resizeCanvas(canvas);
//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, [resizeCanvas]);

//   return (
//     <Card
//       variant="outlined"
//       className="w-full h-full rounded-2xl border border-gray-100 relative"
//     >
//       <CardContent className="w-full h-full p-0 relative">
//         <canvas
//           ref={canvasRef}
//           onMouseDown={handleMouseDown}
//           onMouseMove={handleMouseMove}
//           onMouseUp={handleMouseUp}
//           onMouseLeave={handleMouseUp}
//           className={`w-full h-full bg-white rounded-2xl ${
//             isErasing ? 'cursor-cell' : 'cursor-crosshair'
//           }`}
//         />
//         <Box
//           sx={{
//             position: 'absolute',
//             bottom: 16,
//             right: 16,
//             display: 'flex',
//             gap: 1,
//             bgcolor: 'rgba(255,255,255,0.9)',
//             borderRadius: 3,
//             boxShadow: '0px 3px 8px rgba(0,0,0,0.2)',
//             p: 1,
//           }}
//         >
//           <IconButton
//             color={!isErasing ? 'primary' : 'default'}
//             onClick={() => setIsErasing(false)}
//           >
//             <CreateIcon />
//           </IconButton>
//           <IconButton
//             color={isErasing ? 'error' : 'default'}
//             onClick={() => setIsErasing(true)}
//           >
//             <KitchenIcon />
//           </IconButton>
//         </Box>
//       </CardContent>
//     </Card>
//   );
// };
