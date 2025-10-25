import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role } from '/generated/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import cors from 'cors';
import dotenv from 'dotenv';

/**
 * THIS IS PURELY A SAMPLE USAGE PAGE
 * this page shows how to access, check, and use the jwt token
 */

interface JwtPayload {
    userId: string;
    email: string;
    role: Role;
    username: string;
    iat: number;
    exp: number;
}

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

// checks if user's jwt token is still valid, if not need to sign in again to get assigned new token
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user as JwtPayload;
        next();
    });
};

const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== Role.ADMIN) {
        return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
};

const isUser = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== Role.USER) {
        return res.status(403).json({ message: "Access denied. Users only." });
    }
    next();
};

// --- Example Protected Routes (not part of user service)---

// Admin-only route to add a question
app.post('/api/admin/questions', authenticateToken, isAdmin, (req: AuthRequest, res: Response) => {
    res.json({ message: `Welcome Admin ${req.user?.email}! You can add a question.` });
});

// User-only route to enter the matching service
app.post('/api/matchmaking', authenticateToken, isUser, (req: AuthRequest, res: Response) => {
    res.json({ message: `Welcome User ${req.user?.email}! You can find a match.` });
});