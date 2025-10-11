import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role } from '../../../../generated/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Zod Schemas for pw and email validation ---
const authSchema = z.object({
    email: z.string().email(),
    password: z.string()
        .min(8, { message: "Password must be at least 8 characters long." })
        .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
        .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
        .regex(/[0-9]/, { message: "Password must contain at least one number." })
        .regex(/[@$!%*?&]/, { message: "Password must contain at least one special character (@$!%*?&)." }),
});


// --- JWT Payload Interface ---
interface JwtPayload {
    userId: string;
    email: string;
    role: Role;
    iat: number;
    exp: number;
}


// --- API Endpoints ---

// 1. SIGN UP (for regular users)
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password } = authSchema.parse(req.body);
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        // New users are automatically assigned the default 'USER' role by the schema
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });

        const token = jwt.sign(
            { userId: newUser.id, email: newUser.email, role: newUser.role }, // Include role in JWT
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        );

        res.status(201).json({ message: 'User created successfully.', token });
    } catch (error) {
        res.status(400).json({ message: 'Invalid request', details: error });
    }
});

// 2. LOG IN (for user or admin)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = authSchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        );

        res.status(200).json({ message: 'Login successful.', token });
    } catch (error) {
        res.status(400).json({ message: 'Invalid request', details: error });
    }
});


// --- Middleware for Authentication & Authorization ---
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

// const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
//     if (req.user?.role !== Role.ADMIN) {
//         return res.status(403).json({ message: "Access denied. Admins only." });
//     }
//     next();
// };
//
// const isUser = (req: AuthRequest, res: Response, next: NextFunction) => {
//     if (req.user?.role !== Role.USER) {
//         return res.status(403).json({ message: "Access denied. Users only." });
//     }
//     next();
// };
//
// // --- Example Protected Routes (not part of user service)---
//
// // Admin-only route to add a question
// app.post('/api/admin/questions', authenticateToken, isAdmin, (req: AuthRequest, res: Response) => {
//     res.json({ message: `Welcome Admin ${req.user?.email}! You can add a question.` });
// });
//
// // User-only route to enter the matching service
// app.post('/api/matchmaking', authenticateToken, isUser, (req: AuthRequest, res: Response) => {
//     res.json({ message: `Welcome User ${req.user?.email}! You can find a match.` });
// });


app.get('/api/users/me/sessions', authenticateToken, async (req: AuthRequest, res: Response) => {
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});