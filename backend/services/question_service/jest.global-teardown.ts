import { execSync } from 'node:child_process';
export default async () => {
  try {
    execSync('docker compose -f docker-compose.test.yaml down -v', {
      stdio: 'inherit',
    });
  } catch {}
};
