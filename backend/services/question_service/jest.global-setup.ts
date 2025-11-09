import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export default async () => {
  execSync('docker compose -f docker-compose.test.yaml up -d --wait', {
    stdio: 'inherit',
  });

  const envPath = path.join(process.cwd(), '.env.test');
  if (fs.existsSync(envPath)) {
    for (const ln of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = ln.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
      if (m) process.env[m[1]] = m[2];
    }
  }

  // Use Prisma for schema + seed
  try {
    execSync('npx prisma migrate deploy --schema ./prisma/schema.prisma', {
      stdio: 'inherit',
    });
  } catch {
    execSync('npx prisma db push --schema ./prisma/schema.prisma', {
      stdio: 'inherit',
    });
  }
  execSync('npx prisma db seed --schema ./prisma/schema.prisma', {
    stdio: 'inherit',
  });
};
