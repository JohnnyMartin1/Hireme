/**
 * Offline check for FA / generalist sanitize override (no OpenAI, no Firestore).
 * Run: npx tsx scripts/validate-role-resolution.ts
 */
import { verifyFinancialAnalystGeneralistSanitizeOverride } from '@/lib/ai/parse-job';

const ok = verifyFinancialAnalystGeneralistSanitizeOverride();
if (!ok) {
  console.error('[validate-role-resolution] FAILED: expected canonicalRole !== generalist');
  process.exit(1);
}
console.info('[validate-role-resolution] OK');
