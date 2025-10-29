// src/types/express.d.ts

import 'express-serve-static-core';

import type { UserContext } from '../middleware/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

export {};
