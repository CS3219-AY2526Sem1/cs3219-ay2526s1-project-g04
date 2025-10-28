// src/types/express.d.ts
import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      sub?: string;
      userId?: string;
      role?: 'admin' | 'service' | 'anonymous' | string;
    };
  }
}
