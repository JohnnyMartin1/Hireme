import { adminDb } from '@/lib/firebase-admin';
import { runJobMatching } from '@/lib/matching/job-matching';

async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    throw new Error('Usage: npx tsx scripts/run-job-matching-once.ts <jobId>');
  }
  await runJobMatching(adminDb, jobId);
  console.log(`runJobMatching completed for ${jobId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

