import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import fs from 'fs';

dotenv.config();
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3005;
const OTP_COOLDOWN_SECONDS = 60;
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size (e.g., 5MB)
  fileFilter: (req, file, cb) => {
    // Filter for allowed image types
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
    }
  },
});

const privateKey = fs.readFileSync('./private.pem', 'utf8');
const publicKey = fs.readFileSync('./public.pem', 'utf8');

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
    .max(30, { message: 'Username should not exceed 30 characters.' })
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

const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const resendOtpSchema = z.object({
  email: z.string().email(),
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
 * Functions
 */

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

  jwt.verify(token, publicKey, { algorithms: ['RS256'] }, (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err);
      return res.sendStatus(403);
    }
    req.user = user as JwtPayload;
    next();
  });
};

/**
 * OTP and emailing
 */
// Nodemailer Transport for Mailtrap
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// send OTP emails
async function sendOtpEmail(email: string, otp: string) {
  const productIconUrl =
    'https://s3.ap-southeast-2.amazonaws.com/peerprep.prep/peerprep_banner.png';

  await transporter.sendMail({
    from: '"PeerPrep" <no-reply@peerprep.com>',
    to: email,
    subject: 'Your PeerPrep Verification Code',
    text: `Your PeerPrep verification code is: ${otp}. It will expire in 10 minutes.`,
    html: `
      <!doctype html>
      <html>
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        </head>
        <body style="font-family: sans-serif;">
          <div style="display: block; margin: auto; max-width: 600px;" class="main">
            <div style="text-align: center; margin-bottom: 20px;">
              <img alt="PeerPrep Banner" src="${productIconUrl}" style="width: 400px; display: inline-block;">
            </div>
            <h1 style="font-size: 18px; font-weight: bold; margin-top: 20px">Your PeerPrep Verification Code</h1>
            <p>Thank you for signing up with PeerPrep!</p>
            <p>Please use the following code to verify your account. The code is valid for 10 minutes.</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; background: #f2f2f2; padding: 10px 20px; text-align: center;">
              ${otp}
            </p>
            <p>If you did not request this, please ignore this email.</p>
          </div>
          <style>
            .main { background-color: white; }
            a:hover { border-left-width: 1em; min-height: 2em; }
          </style>
        </body>
      </html>
    `,
  });
}

/**
 * API Endpoints
 */

/**
 * session and authentication
 */
// 1. SIGN UP (for regular users)
// in src/index.ts

app.post('/user/auth/signup', async (req, res) => {
  try {
    const { email, password, username } = signupSchema.parse(req.body);

    // --- UPDATED LOGIC ---
    // 1. Check if EMAIL already exists
    const userByEmail = await prisma.user.findUnique({ where: { email } });

    if (userByEmail) {
      // If email exists (verified OR unverified), block the signup immediately
      return res.status(409).json({
        message: 'An account with this email already exists. Please log in.',
      });
    }

    // 2. Check if USERNAME already exists (only if email is new)
    const userByUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (userByUsername) {
      return res
        .status(409)
        .json({ message: 'This username is already taken.' });
    }

    // --- If both email and username are available, proceed to create ---
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const now = new Date();

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        isVerified: false,
        verificationOtp: otp,
        otpExpiresAt,
        otpLastSentAt: now,
      },
    });

    await sendOtpEmail(email, otp);

    res.status(201).json({
      message:
        'User created successfully. Please check your email for the OTP to verify your account.',
      user: { email: newUser.email, username: newUser.username },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: 'Invalid input', details: error.issues });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 2. LOG IN (for user or admin)
app.post('/user/auth/login', async (req, res) => {
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

    if (!user.isVerified) {
      return res.status(403).json({
        message:
          'Your account is not verified. Please check your email or request a new OTP.',
      });
    }

    // assign jwt to user
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      privateKey,
      {
        expiresIn: '15m',
        algorithm: 'RS256',
      },
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

app.post('/user/auth/refresh', async (req, res) => {
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
      privateKey,
      {
        expiresIn: '15m',
        algorithm: 'RS256',
      },
    );

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    return res
      .status(403)
      .json({ message: 'Invalid or expired refresh token.', details: error });
  }
});

app.post(
  '/user/auth/logout',
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
  '/user/me/profile',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = updateProfileSchema.parse(req.body);

      if (Object.keys(validatedData).length === 0) {
        return res
          .status(400)
          .json({ message: 'No fields to update provided.' });
      }

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

      // if username updated successfully, issue new jwt
      let newAccessToken: string | undefined = undefined;
      if (validatedData.username) {
        newAccessToken = jwt.sign(
          {
            userId: updatedUser.id,
            username: updatedUser.username,
            role: updatedUser.role,
          },
          privateKey,
          { expiresIn: '15m', algorithm: 'RS256' },
        );
      }

      res.status(200).json({
        message: 'Profile updated successfully.',
        accessToken: newAccessToken,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: 'Invalid text input', details: error.issues });
      }
      if (error instanceof multer.MulterError) {
        return res
          .status(400)
          .json({ message: `File upload error: ${error.message}` });
      }
      if (
        error instanceof Error &&
        error.message.includes('Invalid file type')
      ) {
        return res.status(400).json({ message: error.message });
      }
      console.error('Profile Update Error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

app.get(
  '/user/me/profile',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const userProfile = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          createdAt: true,
          bio: true,
          profilePictureUrl: true,
        },
      });

      if (!userProfile) {
        return res.status(404).json({ message: 'User profile not found.' });
      }

      res.status(200).json(userProfile);
    } catch (error) {
      console.error('Failed to retrieve user profile:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

app.post(
  '/user/me/profile-picture',
  authenticateToken,
  upload.single('profilePicture'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ message: 'No profile picture file uploaded.' });
      }

      const file = req.file;
      const fileName = `${req.user!.userId}-${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;

      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      const profilePictureS3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { profilePictureUrl: profilePictureS3Url },
      });

      res.status(200).json({
        message: 'Profile picture updated successfully.',
        profilePictureUrl: profilePictureS3Url,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Internal server error', details: error });
    }
  },
);

app.put(
  '/user/me/email',
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
  '/user/me/password',
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

app.post('/user/auth/verify-email', async (req, res) => {
  try {
    const { email, otp } = verifyEmailSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.verificationOtp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }
    if (new Date() > user.otpExpiresAt!) {
      return res.status(400).json({ message: 'OTP has expired.' });
    }

    await prisma.user.update({
      where: { email },
      data: { isVerified: true, verificationOtp: null, otpExpiresAt: null },
    });

    const accessToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      privateKey,
      {
        expiresIn: '15m',
        algorithm: 'RS256',
      },
    );

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

    res.status(200).json({
      message: 'Email verified successfully.',
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
});

app.post('/user/auth/resend-otp', async (req, res) => {
  try {
    const { email } = resendOtpSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.isVerified) {
      return res.status(400).json({
        message: 'Already verified, cannot resend OTP for this account.',
      });
    }
    if (
      user.otpLastSentAt &&
      new Date().getTime() - user.otpLastSentAt.getTime() <
        OTP_COOLDOWN_SECONDS * 1000
    ) {
      return res.status(429).json({
        message: `Please wait ${OTP_COOLDOWN_SECONDS} seconds before requesting another OTP.`,
      });
    }
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const now = new Date();

    await prisma.user.update({
      where: { email },
      data: { verificationOtp: otp, otpExpiresAt, otpLastSentAt: now },
    });

    await sendOtpEmail(email, otp);

    res.status(200).json({ message: 'A new OTP has been sent to your email.' });
  } catch (error) {
    res.status(400).json({ message: 'Invalid request', details: error });
  }
});

// username availability check
app.get('/user/check-username', async (req: Request, res: Response) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res
        .status(400)
        .json({ message: 'Username query parameter is required.' });
    }

    const user = await prisma.user.findUnique({
      where: { username: username },
      select: { id: true },
    });

    res.status(200).json({ isAvailable: !user });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Internal server error checking username.', error });
  }
});

app.get('/user/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },

      select: {
        username: true,
        bio: true,
        profilePictureUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
});

/**
 * Temporary utility endpoints
 * NOT part of final product!!
 */
// UTILITY TO BE DELETED !!!!!
// list all users in db
app.get('/user/utility/list', async (req, res) => {
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
app.listen(PORT, () => {});
