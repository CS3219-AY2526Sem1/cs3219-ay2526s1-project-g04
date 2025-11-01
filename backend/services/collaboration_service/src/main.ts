import { Collab } from './collab.js';

/**
 * Entry point for collab service
 */
async function main() {
  const collab = new Collab();
  try {
    await collab.start();
    console.log('Collaboration service is running');
  } catch (err) {
    console.error('Failed to start collab service:', err);
    process.exit(1);
  }
}

main();
