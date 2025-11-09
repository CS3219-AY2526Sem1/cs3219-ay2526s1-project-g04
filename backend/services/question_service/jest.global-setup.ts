// tests/jest.globalSetup.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { generateKeyPairSync } from 'node:crypto';

export default async () => {
  // 1) Boot DB
  execSync('docker compose -f docker-compose.test.yaml up -d --wait', {
    stdio: 'inherit',
  });

  // 2) Load .env.test
  const envPath = path.join(process.cwd(), '.env.test');
  if (fs.existsSync(envPath)) {
    for (const ln of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = ln.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
      if (m) process.env[m[1]] = m[2];
    }
  }
  process.env['NODE_ENV'] = 'test';

  // Fallback to what your logs showed (5430) if not set
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] =
      'postgresql://postgres@localhost:5430/qs_test';
  }

  const pubPath = path.join(process.cwd(), 'public.pem');
  const privPath = path.join(process.cwd(), '.private.test.pem');

  if (!fs.existsSync(pubPath) || !fs.existsSync(privPath)) {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicExponent: 0x10001,
    });
    fs.writeFileSync(
      privPath,
      privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    );
    fs.writeFileSync(
      pubPath,
      publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    );
  }

  // 3) Apply raw SQL migration with psql
  // psql prefers postgres:// — convert if needed
  const psqlUrl = process.env['DATABASE_URL'].replace(
    /^postgresql:\/\//,
    'postgres://',
  );
  const sqlFile = path.join(process.cwd(), 'migrations/0001_init.sql');

  // Option A: run host psql (recommended if psql is installed)
  try {
    execSync(`psql "${psqlUrl}" -v ON_ERROR_STOP=1 -f "${sqlFile}"`, {
      stdio: 'inherit',
      env: process.env,
    });
  } catch (e) {
    // Option B: fallback via docker (no psql on host).
    // Replace "postgres" with your service name if different.
    const dbName = new URL(psqlUrl).pathname.replace(/^\//, '') || 'qs_test';
    const sql = fs.readFileSync(sqlFile);
    execSync(
      `docker compose -f docker-compose.test.yaml exec -T postgres psql -U postgres -d ${dbName} -v ON_ERROR_STOP=1 -f -`,
      { stdio: 'pipe', input: sql },
    );
  }

  // 4) Seed using your prisma/seed.ts
  // Make sure package.json has:  "prisma": { "seed": "tsx prisma/seed.ts" }
  execSync('npx prisma db seed --schema ./prisma/schema.prisma', {
    stdio: 'inherit',
    env: process.env,
  });
};
