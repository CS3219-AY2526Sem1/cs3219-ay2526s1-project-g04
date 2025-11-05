/**
 * Entry point for collab service
 */
async function main() {
  //   const collab = new Collab();
  try {
    // await collab.start();
    console.log('Communication service is running');
  } catch (err) {
    console.error('Failed to start Com service:', err);
    process.exit(1);
  }
}

main();
