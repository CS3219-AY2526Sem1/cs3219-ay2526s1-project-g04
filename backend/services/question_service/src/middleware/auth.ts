// src/middleware/auth.ts

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { log } from '../utils/logger.js';

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: Role;
  iat: number;
  exp: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

const publicKey = fs.readFileSync(
  path.join(process.cwd(), 'public.pem'),
  'utf-8',
);

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, publicKey, { algorithms: ['RS256'] }, (err, user) => {
    if (err) {
      log.error('JWT Verification Error: ', err.message);
      return res.sendStatus(403);
    }

    req.user = user as JwtPayload;
    next();
  });
};

export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
};

// Middleware to check if user is a regular USER
export const isUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== Role.USER) {
    return res.status(403).json({ message: 'Access denied. Users only.' });
  }
  next();
};
