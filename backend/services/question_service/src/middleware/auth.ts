// src/middleware/auth.ts
// Auth0 JWT verification (RS256 via JWKS) + role/permission gates

import type { Request, Response, NextFunction } from 'express';
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import { log } from '../utils/logger.js';

type UserRole = 'admin' | 'service' | 'anonymous';

export interface UserContext {
  sub?: string;
  userId?: string;
  role: UserRole;
  permissions?: string[];
  scopes?: string[];
  raw: Record<string, unknown>;
}

/**
 * Creates a UserContext object from a JWT payload and a user role.
 * Extracts the user ID (sub), permissions, and scopes from the JWT payload.
 * @param {JWTPayload} payload - The JWT payload to extract data from.
 * @param {UserRole} role - The user role (admin, service, or anonymous).
 * @returns {UserContext} - The created UserContext object.
 */
function makeUserContext(payload: JWTPayload, role: UserRole): UserContext {
  const ctx: UserContext = {
    role,
    raw: payload as Record<string, unknown>,
  };

  const sub = isString(payload.sub) ? payload.sub : undefined;
  if (sub) {
    ctx.sub = sub;
    ctx.userId = sub;
  }

  const perms = getPermissions(payload as Auth0LikeClaims);
  if (perms.length) ctx.permissions = perms;

  const scopes = getScopes(payload as Auth0LikeClaims);
  if (scopes.length) ctx.scopes = scopes;

  return ctx;
}

const ISSUER = process.env['JWT_ISSUER'] ?? '';
const JWKS_URL = process.env['JWKS_URL'] ?? '';
const AUDIENCE = process.env['JWT_AUDIENCE']; // recommended for Auth0 APIs
const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

interface Auth0LikeClaims extends JWTPayload {
  permissions?: unknown;
  scope?: unknown;
  scopes?: unknown;
  role?: unknown;
  roles?: unknown;
  gty?: unknown; // "client-credentials"
  azp?: unknown; // authorized party (client_id)
}

// helpers
function isString(x: unknown): x is string {
  return typeof x === 'string';
}
function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every(isString);
}
function getPermissions(c: Auth0LikeClaims): string[] {
  return isStringArray(c.permissions) ? c.permissions : [];
}
function getScopes(c: Auth0LikeClaims): string[] {
  if (isStringArray(c.scopes)) return c.scopes;
  if (isString(c.scope)) return c.scope.split(' ').filter(Boolean);
  return [];
}
function getRoles(c: Auth0LikeClaims): string[] {
  if (isString(c.role)) return [c.role];
  return isStringArray(c.roles) ? c.roles : [];
}
function isClientCredentials(c: Auth0LikeClaims): boolean {
  return c.gty === 'client-credentials' || isString(c.azp);
}

// ---- JWKS (cached) ----
const getJWKS = (() => {
  let getKey: JWTVerifyGetKey | null = null;
  return (): JWTVerifyGetKey => {
    if (!getKey) {
      if (!JWKS_URL) throw new Error('JWKS_URL not configured');
      getKey = createRemoteJWKSet(new URL(JWKS_URL), {
        cacheMaxAge: 10 * 60_000,
      });
    }
    return getKey;
  };
})();

/** Extract role from common claim shapes (Auth0-first) */
function resolveRole(payload: JWTPayload): UserRole {
  const claims = payload as Auth0LikeClaims;

  // Auth0 RBAC: permissions[] claim
  const perms = getPermissions(claims);
  if (perms.includes('question:admin')) return 'admin';
  if (perms.includes('question:service') || perms.includes('question:select'))
    return 'service';

  // Scopes fallback
  const scopeArr = getScopes(claims);
  if (scopeArr.includes('question:admin')) return 'admin';
  if (
    scopeArr.includes('question:service') ||
    scopeArr.includes('question:select')
  )
    return 'service';

  // Explicit role(s) fallback
  const roles = getRoles(claims);
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('service')) return 'service';

  // Client credentials heuristic
  if (isClientCredentials(claims)) return 'service';

  return 'anonymous';
}

function devFallbackFromHeaders(req: Request) {
  // For local/dev convenience: X-Role and X-User headers
  const roleRaw = String(req.headers['x-role'] ?? '').toLowerCase();
  const role: UserRole =
    roleRaw === 'admin'
      ? 'admin'
      : roleRaw === 'service'
        ? 'service'
        : 'anonymous';
  const sub = String(req.headers['x-user'] ?? 'dev-user');
  return { sub, role } as const;
}

async function verifyToken(token: string) {
  const opts: {
    issuer?: string;
    audience?: string | string[];
    clockTolerance: number;
  } = { clockTolerance: 5 };

  if (ISSUER) opts.issuer = ISSUER;
  if (AUDIENCE) opts.audience = AUDIENCE;

  return jwtVerify(token, getJWKS(), opts);
}

/** Attach req.user if a valid Bearer JWT is present (no errors thrown). */
export function optionalAuth() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        if (
          NODE_ENV !== 'production' &&
          (req.headers['x-role'] || req.headers['x-user'])
        ) {
          const { sub, role } = devFallbackFromHeaders(req);
          req.user = { sub, role, raw: { dev: true } } as UserContext;
        }
        return next();
      }

      const token = auth.slice('Bearer '.length);
      const { payload } = await verifyToken(token);
      const role = resolveRole(payload);
      req.user = makeUserContext(payload, role);
      return next();
    } catch {
      // swallow errors for optional auth
      return next();
    }
  };
}

/** Require a valid JWT; attach req.user or 401 */
export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        if (
          NODE_ENV !== 'production' &&
          (req.headers['x-role'] || req.headers['x-user'])
        ) {
          const { sub, role } = devFallbackFromHeaders(req);
          req.user = { sub, role, raw: { dev: true } } as UserContext;
          return next();
        }
        return res.status(401).json({ error: 'unauthorized' });
      }

      const token = auth.slice('Bearer '.length);
      const { payload } = await verifyToken(token);
      const role = resolveRole(payload);
      req.user = makeUserContext(payload, role);
      return next();
    } catch (err) {
      log.error(err);
      return res.status(401).json({ error: 'unauthorized' });
    }
  };
}

/** Require a specific role (admin OR service) */
export function requireRole(role: Exclude<UserRole, 'anonymous'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = req.user?.role;
    if (r === role) return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}

/** Require any role from a set (e.g., ['admin','service']) */
export function requireAnyRole(roles: Exclude<UserRole, 'anonymous'>[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = req.user?.role;
    if (r && r !== 'anonymous' && roles.includes(r)) return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}

/** Require an Auth0 permission (e.g., 'question:select' or 'question:admin') */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const perms = req.user?.permissions ?? [];
    const scopes = req.user?.scopes ?? [];
    if (perms.includes(permission) || scopes.includes(permission))
      return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}
