import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role } from '../generated/prisma';
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

/**
 * Schemas
 */
// --- Zod Schemas for pw and email validation ---
const signupSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long.' })
    .regex(/[A-Z]/, {
      message: 'Password must contain at least one uppercase letter.',
    })
    .regex(/[a-z]/, {
      message: 'Password must contain at least one lowercase letter.',
    })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
    .regex(/[@$!%*?&]/, {
      message:
        'Password must contain at least one special character (@$!%*?&).',
    }),
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters long.' })
    .regex(/^[a-z0-9_]+$/, {
      message:
        'Username can only contain lowercase letters, numbers, and underscores (_).',
    }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshTokenSchema = z.object({
  token: z.string(),
});

const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters.' })
    .max(30, { message: 'Username should not exceed 30 characters.' })
    .regex(/^[a-z0-9_]+$/, {
      message:
        'Username can only contain lowercase letters, numbers, and underscores (_).',
    })
    .optional(),
  bio: z
    .string()
    .max(150, 'Bio cannot exceed 150 characters.')
    .optional()
    .nullable(),
  profilePictureUrl: z
    .string()
    .url('Must be a valid URL.')
    .optional()
    .nullable(),
});

const updateEmailSchema = z.object({
  newEmail: z.string().email(),
  password: z.string(), // current password for verification
});

const updatePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z
    .string() // same rules as sign up pw
    .min(8, { message: 'Password must be at least 8 characters long.' })
    .regex(/[A-Z]/, {
      message: 'Password must contain at least one uppercase letter.',
    })
    .regex(/[a-z]/, {
      message: 'Password must contain at least one lowercase letter.',
    })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
    .regex(/[@$!%*?&]/, {
      message: 'Password must contain at least one special character.',
    }),
});

// --- JWT Payload Interface ---
interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  username: string;
  iat: number;
  exp: number;
}

interface RefreshTokenPayload {
  userId: string;
}

// --- Middleware for Authentication & Authorization ---
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * Token handling
 */
// checks if user's jwt token is still valid, if not need to sign in again to get assigned new token
const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // Unauthorized

  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden
    req.user = user as JwtPayload;
    next();
  });
};

/**
 * API Endpoints
 */

/**
 * session and authentication
 */
// 1. SIGN UP (for regular users)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, username } = signupSchema.parse(req.body);
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email }, { username: username }],
      },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // default USER role
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username: username,
      },
    });

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role }, // Include role in JWT
      process.env.JWT_SECRET!,
      { expiresIn: '24h' },
    );

    res.status(201).json({ message: 'User created successfully.', token });
  } catch (error) {
    res.status(400).json({ message: 'Invalid request', details: error });
  }
});

// 2. LOG IN (for user or admin)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // assign jwt to user
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' },
    );

    // assign refresh token to user + save in db
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET!,
      { expiresIn: '7d' },
    );
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    res.status(200).json({ message: 'Login successful.', token, refreshToken });
  } catch (error) {
    res.status(400).json({ message: 'Invalid request', details: error });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { token: refreshToken } = refreshTokenSchema.parse(req.body);
    if (!refreshToken) return res.sendStatus(401);

    const payload = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!,
    ) as RefreshTokenPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user || !user.refreshToken) return res.sendStatus(403);

    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isTokenValid) return res.sendStatus(403);

    const newAccessToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' },
    );

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    return res
      .status(403)
      .json({ message: 'Invalid or expired refresh token.', details: error });
  }
});

app.post(
  '/api/auth/logout',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { refreshToken: null },
      });
      res.status(200).json({ message: 'Logged out successfully.' });
    } catch (error) {
      res.status(500).json({ message: 'Logout failed.', details: error });
    }
  },
);

/**
 * Endpoints for editing user details
 */
app.put(
  '/api/users/me/profile',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = updateProfileSchema.parse(req.body);
      if (Object.keys(validatedData).length === 0) {
        return res
          .status(400)
          .json({ message: 'No fields to update provided.' });
      }

      // NOT GNA ALLOW TO UPDATE USERNAME??
      if (validatedData.username) {
        const existingUser = await prisma.user.findUnique({
          where: { username: validatedData.username },
        });
        if (existingUser && existingUser.id !== req.user!.userId) {
          return res
            .status(409)
            .json({ message: 'This username is already taken.' });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user!.userId },
        data: validatedData,
      });

      if (updatedUser) {
        res.status(200).json({ message: 'Profile updated successfully.' });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: 'Invalid input', details: error.issues });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

app.put(
  '/api/users/me/email',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { newEmail, password } = updateEmailSchema.parse(req.body);
      const userId = req.user!.userId;

      // verify password
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Incorrect password.' });
      }

      // check if email is already being used by another account
      const emailExists = await prisma.user.findUnique({
        where: { email: newEmail },
      });
      if (emailExists) {
        return res
          .status(409)
          .json({ message: 'This email address is already in use.' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
      });

      res.status(200).json({
        message:
          'Email updated successfully. Please use it for your next login.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: 'Invalid input', details: error.issues });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

app.put(
  '/api/users/me/password',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { oldPassword, newPassword } = updatePasswordSchema.parse(req.body);
      const userId = req.user!.userId;

      // verify old pw
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
        return res.status(401).json({ message: 'Incorrect old password.' });
      }

      // save new pw
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      // log out all other sessions by clearing refresh tokens
      // await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });

      res.status(200).json({ message: 'Password updated successfully.' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: 'Invalid input', details: error.issues });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

/**
 * Temporary utility endpoints
 * NOT part of final product!!
 */
// UTILITY TO BE DELETED !!!!!
// list all users in db
app.post('/api/auth/list', async (req, res) => {
  try {
    const allUsers = await prisma.user.findMany();
    res.status(200).json({ message: 'List successful', details: allUsers });
  } catch (error) {
    res.status(400).json({ message: 'Invalid request', details: error });
  }
});

/**
 * port
 */
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
