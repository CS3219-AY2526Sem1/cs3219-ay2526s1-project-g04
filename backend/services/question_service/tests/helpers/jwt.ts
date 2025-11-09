import fs from 'node:fs';
import path from 'node:path';
import { SignJWT, importPKCS8 } from 'jose';

// Private key written by jest.global-setup.ts
const PRIV = path.join(process.cwd(), '.private.test.pem');

type Role = 'ADMIN' | 'USER';

async function signAccess(payload: {
  userId: string;
  username: string;
  role: Role;
}) {
  const pem = fs.readFileSync(PRIV, 'utf8');
  const key = await importPKCS8(pem, 'RS256');

  return await new SignJWT({
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt() // iat
    .setExpirationTime('15m') // exp ~ matches your access token rule
    .sign(key);
}

export async function makeAdminToken() {
  return signAccess({
    userId: 'admin-1',
    username: 'admin@test.local',
    role: 'ADMIN',
  });
}

export async function makeUserToken() {
  return signAccess({
    userId: 'user-1',
    username: 'user@test.local',
    role: 'USER',
  });
}
