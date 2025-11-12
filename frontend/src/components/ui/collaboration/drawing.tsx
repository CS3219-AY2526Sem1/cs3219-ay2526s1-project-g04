'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Card, Box, IconButton } from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import KitchenIcon from '@mui/icons-material/Kitchen';
import * as Y from 'yjs';

interface Stroke {
  id: string;
  userId: string;
  points: { x: number; y: number }[];
}

interface DrawingBoardProps {
  yCommsDoc: Y.Doc;
  userId: string;
}

export const DrawingBoard = ({ yCommsDoc, userId }: DrawingBoardProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const yStrokes = useRef<Y.Array<Stroke>>(yCommsDoc.getArray('strokes'));

  // Helper to draw all strokes
  const drawAll = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    yStrokes.current.toArray().forEach((stroke) => {
      ctx.beginPath();
      ctx.strokeStyle = stroke.userId === userId ? '#8b5cf7' : '#3b82f6';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      stroke.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });
  };

  // Sync drawing when Yjs updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const observer = () => drawAll(ctx);
    yStrokes.current.observe(observer);
    observer();

    return () => yStrokes.current.unobserve(observer);
  }, [yCommsDoc, userId]);

  // Resize canvas to fit (parent) container. This makes the board dynamic when resizing window.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      drawAll(ctx);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [yCommsDoc, userId]);

  // Drawing Logic
  const getPos = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    if (isErasing) {
      eraseStroke(pos);
      return;
    }
    const newStroke: Stroke = {
      id: Math.random().toString(36).substring(2, 9),
      userId,
      points: [pos],
    };
    setCurrentStroke(newStroke);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);

    if (isErasing && e.buttons === 1) {
      eraseStroke(pos);
      return;
    }

    if (!isDrawing || !currentStroke) return;
    const updated = {
      ...currentStroke,
      points: [...currentStroke.points, pos],
    };
    setCurrentStroke(updated);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const points = updated.points;
      const last = points[points.length - 2];
      const now = points[points.length - 1];
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(now.x, now.y);
      ctx.strokeStyle = '#8b5cf7';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (currentStroke) yStrokes.current.push([currentStroke]);
    setIsDrawing(false);
    setCurrentStroke(null);
  };

  // Erase entire stroke if clicked near any of its points
  const eraseStroke = (pos: { x: number; y: number }) => {
    const strokes = yStrokes.current.toArray();
    const threshold = 20; // eraser radius
    for (let i = 0; i < strokes.length; i++) {
      for (const p of strokes[i].points) {
        const dx = p.x - pos.x;
        const dy = p.y - pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < threshold) {
          yStrokes.current.delete(i, 1);
          return;
        }
      }
    }
  };

  return (
    <Card className="w-full h-full relative rounded-2xl overflow-hidden">
      {/* Pen / Eraser toggle */}
      <Box className="absolute top-2 left-2 flex gap-2 z-10">
        <IconButton
          onClick={() => setIsErasing(!isErasing)}
          sx={{
            color: isErasing ? '#ef4444' : '#8b5cf7',
          }}
        >
          {isErasing ? <KitchenIcon /> : <CreateIcon />}
        </IconButton>
      </Box>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="w-full h-full bg-white"
      />
    </Card>
  );
};
