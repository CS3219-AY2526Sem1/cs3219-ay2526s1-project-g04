// src/types/express.d.ts

import 'express-serve-static-core';

export type UserRole = 'admin' | 'service' | 'anonymous';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      sub?: string;
      userId?: string;
      role: UserRole;
      scopes?: string[];
      raw?: Record<string, unknown>;
    };
  }
}
