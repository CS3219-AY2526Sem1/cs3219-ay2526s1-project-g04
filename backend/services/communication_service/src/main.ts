import { Commmunication } from './communication';

/**
 * Entry point for collab service
 */
async function main() {
  const communication = new Commmunication();
  try {
    await communication.start();
    console.log('Communication service is running');
  } catch (err) {
    console.error('Failed to start Com service:', err);
    process.exit(1);
  }
}

main();
