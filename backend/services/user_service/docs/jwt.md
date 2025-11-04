# Authentication Guide for Microservices

This document explains how to authenticate and authorize requests in your service (e.g., collab-service, question-service) using the central user-service.

---

## 1. High-Level Architecture (RS256)

The authentication system uses an asymmetric (public/private key) model.

- **The user-service is the Issuer**  
  It stores user passwords and issues tokens. It signs all Access Tokens using a **Private Key** (RS256 algorithm).

- **Your Service is the Verifier**  
  It doesn't create tokens or handle secrets. It only uses the **Public Key** to verify incoming tokens.

---

## 2. Step 1: Get the Public Key

You need the `public.pem` file to verify tokens.

**Instructions:**
1. Copy `public.pem` from the root of the user-service.
2. Place it in the root of your service (e.g., `collaboration_service/`).
3. It's safe to commit this file to Git.

Your service folder should look like this:

```
your-service/
├── src/
│   ├── index.ts
│   └── middleware/
│       └── auth.ts  <-- You will create this
├── .env
├── package.json
├── public.pem     <-- Add this file
└── tsconfig.json
```

---

## 3. Step 2: Install Dependencies

In your service directory (e.g., `/backend/collaboration_service`):

```bash
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

---

## 4. Step 3: Create the Authentication Middleware

Create a new file at `src/middleware/auth.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// Manually define the Role enum to avoid a dependency on the user-service DB
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

// The payload we put inside the Access Token
export interface JwtPayload {
  userId: string;
  username: string;
  role: Role;
  iat: number;
  exp: number;
}

// Extend the Express Request object
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

const publicKey = fs.readFileSync(path.join(process.cwd(), 'public.pem'), 'utf8');

// Middleware to authenticate a request
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401); // Unauthorized

  jwt.verify(token, publicKey, { algorithms: ['RS256'] }, (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err.message);
      return res.sendStatus(403); // Forbidden
    }
    req.user = user as JwtPayload;
    next();
  });
};

// Middleware to check if user is an admin
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
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
```

---

## 5. Step 4: Use the Middleware in Your Service

Example file: `src/index.ts` (Collab Service)

```ts
import express, { Response } from 'express';
import {
  authenticateToken,
  isAdmin,
  isUser,
  AuthRequest,
} from './middleware/auth';

const app = express();
app.use(express.json());

// Public route
app.get('/collab/public-info', (req, res) => {
  res.json({ message: 'This data is public.' });
});

// Protected route (any authenticated user)
app.get(
  '/collab/my-sessions',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    res.json({ message: `Fetching all sessions for user ${userId}` });
  },
);

// Admin-only route
app.delete(
  '/collab/admin/delete-session/:id',
  authenticateToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    const adminUsername = req.user!.username;
    res.json({
      message: `Admin ${adminUsername} is deleting session ${req.params.id}`,
    });
  },
);

app.listen(3002, () => {
  console.log('Collab Service running on http://localhost:3002');
});
```

