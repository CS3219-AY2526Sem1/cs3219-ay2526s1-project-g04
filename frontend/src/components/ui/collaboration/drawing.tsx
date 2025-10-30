'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Stack,
  IconButton,
  Select,
  MenuItem,
} from '@mui/material';
import BrushIcon from '@mui/icons-material/Brush';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import { useCollab } from './CollabProvider';

interface Stroke {
  id: string;
  userId: string;
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

export const DrawingBoard = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { strokes, userId } = useCollab();

  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [isErasingDrag, setIsErasingDrag] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [penSize, setPenSize] = useState(2);

  const userColor = '#7E57C2'; // you
  const otherColor = '#2196F3'; // others

  // 🧭 Get mouse position
  const getMousePos = (e: React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // 📐 Resize canvas for high-DPI screens
  const resizeCanvas = (canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.translate(0.5, 0.5);

    redrawAll(ctx); // only redraw once on resize
  };

  // 🖌️ Redraw all strokes (for resize or erase)
  const redrawAll = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!strokes) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const all = strokes.toArray();
    for (const s of all) drawStroke(ctx, s);
  };

  // ✏️ Draw a single stroke incrementally
  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (!stroke.points || stroke.points.length < 2) return;
    ctx.strokeStyle = stroke.userId === userId ? userColor : otherColor;
    ctx.lineWidth = stroke.size;
    ctx.beginPath();
    const pts = stroke.points;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
  };

  // 👀 Yjs updates
  useEffect(() => {
    if (!strokes || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const render = () => redrawAll(ctx);
    render();

    const observer = () => requestAnimationFrame(render);
    strokes.observe(observer);
    return () => strokes.unobserve(observer);
  }, [strokes]);

  // 📏 Erase helpers
  const distanceToSegment = (p: any, a: any, b: any) => {
    const A = p.x - a.x,
      B = p.y - a.y,
      C = b.x - a.x,
      D = b.y - a.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq ? dot / lenSq : -1;
    let xx, yy;
    if (param < 0) {
      xx = a.x;
      yy = a.y;
    } else if (param > 1) {
      xx = b.x;
      yy = b.y;
    } else {
      xx = a.x + param * C;
      yy = a.y + param * D;
    }
    return Math.hypot(p.x - xx, p.y - yy);
  };

  const findStrokeAtPoint = (
    x: number,
    y: number,
    all: Stroke[],
  ): number | null => {
    const threshold = 6;
    for (let i = all.length - 1; i >= 0; i--) {
      const pts = all[i].points;
      for (let j = 0; j < pts.length - 1; j++) {
        if (distanceToSegment({ x, y }, pts[j], pts[j + 1]) <= threshold)
          return i;
      }
    }
    return null;
  };

  const eraseAt = (x: number, y: number) => {
    if (!strokes || !canvasRef.current) return;
    const all = strokes.toArray();
    const idx = findStrokeAtPoint(x, y, all);
    if (idx !== null) {
      strokes.delete(idx, 1);
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) redrawAll(ctx);
    }
  };

  // 🖱️ Events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const { x, y } = getMousePos(e, canvasRef.current);

    if (isErasing) {
      setIsErasingDrag(true);
      eraseAt(x, y);
      return;
    }

    const newStroke: Stroke = {
      id: crypto.randomUUID(),
      userId,
      color: userColor,
      size: penSize,
      points: [{ x, y }],
    };
    setIsDrawing(true);
    setCurrentStroke(newStroke);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const { x, y } = getMousePos(e, canvasRef.current);

    if (isErasing && isErasingDrag) {
      eraseAt(x, y);
      return;
    }

    if (isDrawing && currentStroke) {
      const updated = {
        ...currentStroke,
        points: [...currentStroke.points, { x, y }],
      };
      setCurrentStroke(updated);

      // Incremental live draw
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) drawStroke(ctx, updated);
    }
  };

  const handleMouseUp = () => {
    if (isErasing) {
      setIsErasingDrag(false);
      return;
    }
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke && currentStroke.points.length > 1 && strokes)
      strokes.push([currentStroke]);
    setCurrentStroke(null);
  };

  // 🪟 Resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resizeCanvas(canvas);
    const handleResize = () => resizeCanvas(canvas);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [strokes]);

  return (
    <Card
      variant="outlined"
      className="w-full h-full rounded-2xl border border-3 border-gray-100"
    >
      <CardContent className="relative w-full h-full p-0 flex flex-col">
        {/* Toolbar */}
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          className="p-2 bg-gray-50"
        >
          <IconButton
            color={!isErasing ? 'primary' : 'default'}
            onClick={() => setIsErasing(false)}
          >
            <BrushIcon />
          </IconButton>

          <IconButton
            color={isErasing ? 'error' : 'default'}
            onClick={() => setIsErasing(true)}
          >
            <CleaningServicesIcon />
          </IconButton>

          <Select
            value={penSize}
            onChange={(e) => setPenSize(Number(e.target.value))}
            size="small"
            sx={{ width: 120 }}
          >
            <MenuItem value={1}>Thin</MenuItem>
            <MenuItem value={2}>Normal</MenuItem>
            <MenuItem value={4}>Thick</MenuItem>
            <MenuItem value={8}>Extra Thick</MenuItem>
          </Select>
        </Stack>

        {/* Canvas */}
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`w-full h-full bg-white rounded-2xl ${
              isErasing ? 'cursor-cell' : 'cursor-crosshair'
            }`}
          />
        </div>
      </CardContent>
    </Card>
  );
};
