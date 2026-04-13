import { adminDb } from '../lib/firebase-admin';
import { parseJobPosting } from '../lib/ai/parse-job';
import { buildNormalizedCandidateProfile } from '../lib/matching/candidate-profile';
import { jobDocToScoringPayload, runJobMatching } from '../lib/matching/job-matching';

type CliOptions = {
  mode: 'all' | 'jobs' | 'candidates' | 'job-matches';
  jobId: string | null;
  dryRun: boolean;
  withEmbeddings: boolean;
  limit: number | null;
};

function parseArgs(argv: string[]): CliOptions {
  const args = new Set(argv);
  const getValue = (name: string): string | null => {
    const hit = argv.find((a) => a.startsWith(`${name}=`));
    if (!hit) return null;
    return hit.slice(name.length + 1).trim() || null;
  };

  const modeRaw = (getValue('--mode') || 'all').toLowerCase();
  const mode = (['all', 'jobs', 'candidates', 'job-matches'].includes(modeRaw)
    ? modeRaw
    : 'all') as CliOptions['mode'];
  const jobId = getValue('--jobId');
  const dryRun = !args.has('--write');
  const withEmbeddings =
    args.has('--with-embeddings') || (!dryRun && !args.has('--no-embeddings'));
  const limitRaw = getValue('--limit');
  const limit = limitRaw ? Math.max(1, parseInt(limitRaw, 10) || 0) || null : null;

  return { mode, jobId, dryRun, withEmbeddings, limit };
}

function summarizeNormalizedCandidate(normalized: ReturnType<typeof buildNormalizedCandidateProfile>) {
  return {
    targetRoles: normalized.targetRoles,
    targetRoleSignals: normalized.targetRoleSignals,
    normalizedRoles: normalized.normalizedRoles,
    normalizedSkills: normalized.normalizedSkills,
    normalizedIndustries: normalized.normalizedIndustries,
    normalizedFunctions: normalized.normalizedFunctions,
    normalizedSummary: normalized.normalizedSummary,
    experienceKeywords: normalized.experienceKeywords,
    educationKeywords: normalized.educationKeywords,
    structuredExperienceSignals: normalized.structuredExperienceSignals,
    skillEvidenceSignals: normalized.skillEvidenceSignals,
    preferenceSignals: normalized.preferenceSignals,
    profileCompletenessSignals: normalized.profileCompletenessSignals,
    hasResume: normalized.hasResume,
    hasVideo: normalized.hasVideo,
    gpaNumeric: normalized.gpaNumeric,
    location: normalized.location,
    jobTypes: normalized.jobTypes,
    workPreferences: normalized.workPreferences,
    updatedAt: new Date().toISOString(),
  };
}

function buildJobEmbeddingText(job: ReturnType<typeof jobDocToScoringPayload>): string {
  return [
    job.normalizedTitle || job.title,
    (job.requiredSkills || []).join(', '),
    (job.preferredSkills || []).join(', '),
    (job.keywords || []).join(', '),
    job.industry || '',
    job.location || [job.locationCity, job.locationState].filter(Boolean).join(', '),
    job.workMode || '',
    job.employment || job.jobType || '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 12000);
}

function buildCandidateEmbeddingText(
  candidate: ReturnType<typeof buildNormalizedCandidateProfile>
): string {
  return [
    candidate.normalizedSummary,
    candidate.normalizedRoles.join(', '),
    candidate.normalizedSkills.join(', '),
    candidate.normalizedIndustries.join(', '),
    candidate.experienceKeywords.join(', '),
    candidate.educationKeywords.join(', '),
    candidate.preferenceSignals.join(', '),
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 12000);
}

async function getEmbeddingViaFetch(text: string): Promise<number[] | null> {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey || !text.trim()) return null;
  const model = String(process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small').trim();
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text.slice(0, 12000),
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn('[backfill] openai embedding failed:', res.status, errText.slice(0, 280));
      return null;
    }
    const json = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
    const emb = json.data?.[0]?.embedding;
    return Array.isArray(emb) ? emb : null;
  } catch (err) {
    console.warn('[backfill] openai embedding request error:', err);
    return null;
  }
}

async function maybeComputeEmbedding(text: string, enabled: boolean): Promise<number[] | null> {
  if (!enabled) return null;
  try {
    return await getEmbeddingViaFetch(text);
  } catch (err) {
    console.warn('[backfill] embedding computation failed:', err);
    return null;
  }
}

async function backfillJobs(options: CliOptions): Promise<{ scanned: number; updated: number }> {
  let query: FirebaseFirestore.Query = adminDb.collection('jobs');
  if (options.jobId) query = adminDb.collection('jobs').where('__name__', '==', options.jobId);
  if (options.limit) query = query.limit(options.limit);

  const snap = await query.get();
  let scanned = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    scanned++;
    const job = doc.data() as Record<string, unknown>;
    const title = String(job.title || '').trim();
    const description = String(job.description || '').trim();
    const tags = Array.isArray(job.tags) ? job.tags.map(String) : [];
    if (!title || !description) {
      console.log(`[jobs] skip ${doc.id}: missing title/description`);
      continue;
    }

    const processed = await parseJobPosting({
      title,
      description,
      tags,
      location: String(job.location || ''),
      locationCity: String(job.locationCity || ''),
      locationState: String(job.locationState || ''),
      jobType: String(job.jobType || job.employment || ''),
      minGpa: String(job.minGpa || job.requiredGpa || ''),
      industry: String(job.industry || ''),
      experienceLevel: String(job.experienceLevel || ''),
      requiredMajors: Array.isArray(job.requiredMajors) ? (job.requiredMajors as string[]).map(String) : [],
      preferredMajors: Array.isArray(job.preferredMajors) ? (job.preferredMajors as string[]).map(String) : [],
      sponsorshipAccepted:
        typeof job.sponsorshipAccepted === 'boolean' ? (job.sponsorshipAccepted as boolean) : null,
      relocationAccepted:
        typeof job.relocationAccepted === 'boolean' ? (job.relocationAccepted as boolean) : null,
      functionalArea: String(job.functionalArea || ''),
      requiredSkillsStructured: Array.isArray(job.requiredSkillsStructured) ? (job.requiredSkillsStructured as string[]).map(String) : [],
      preferredSkillsStructured: Array.isArray(job.preferredSkillsStructured) ? (job.preferredSkillsStructured as string[]).map(String) : [],
    });

    const merged = {
      ...job,
      normalizedTitle: processed.normalizedTitle,
      aiSummary: processed.aiSummary,
      requiredSkills: processed.requiredSkills,
      preferredSkills: processed.preferredSkills,
      seniorityLevel: processed.seniorityLevel,
      keywords: processed.keywords,
      mustHaves: processed.mustHaves,
      niceToHaves: processed.niceToHaves,
      jobFunctions: processed.jobFunctions,
      functionalArea: processed.functionalArea,
      industries: processed.industries,
      experienceLevel: processed.experienceLevel,
      requiredMajors: processed.requiredMajors,
      preferredMajors: processed.preferredMajors,
      sponsorshipAccepted: processed.sponsorshipAccepted,
      relocationAccepted: processed.relocationAccepted,
      locationType: processed.locationType,
      minimumQualifications: processed.minimumQualifications,
      roleAliases: processed.roleAliases,
      jobNormalization: processed,
      aiProcessingSource: processed.source,
      updatedDate: new Date().toISOString(),
    } satisfies Record<string, unknown>;

    const scoring = jobDocToScoringPayload(merged);
    const embedding = await maybeComputeEmbedding(
      buildJobEmbeddingText(scoring),
      options.withEmbeddings
    );

    const updatePayload: Record<string, unknown> = {
      normalizedTitle: processed.normalizedTitle,
      aiSummary: processed.aiSummary,
      requiredSkills: processed.requiredSkills,
      preferredSkills: processed.preferredSkills,
      seniorityLevel: processed.seniorityLevel,
      keywords: processed.keywords,
      mustHaves: processed.mustHaves,
      niceToHaves: processed.niceToHaves,
      jobFunctions: processed.jobFunctions,
      functionalArea: processed.functionalArea,
      industries: processed.industries,
      experienceLevel: processed.experienceLevel,
      requiredMajors: processed.requiredMajors,
      preferredMajors: processed.preferredMajors,
      sponsorshipAccepted: processed.sponsorshipAccepted,
      relocationAccepted: processed.relocationAccepted,
      locationType: processed.locationType,
      minimumQualifications: processed.minimumQualifications,
      roleAliases: processed.roleAliases,
      jobNormalization: processed,
      aiProcessingSource: processed.source,
      updatedDate: new Date().toISOString(),
    };

    if (embedding) {
      updatePayload.embedding = embedding;
      updatePayload.embeddingUpdatedAt = new Date().toISOString();
    }

    if (options.dryRun) {
      console.log(
        `[jobs][dry-run] ${doc.id} title="${title}" normalizedTitle="${processed.normalizedTitle}" requiredSkills=${processed.requiredSkills.length} embedding=${embedding ? 'yes' : 'no'}`
      );
    } else {
      await doc.ref.set(updatePayload, { merge: true });
      console.log(`[jobs][write] updated ${doc.id}`);
      updated++;
    }
  }

  return { scanned, updated: options.dryRun ? scanned : updated };
}

async function backfillCandidates(options: CliOptions): Promise<{ scanned: number; updated: number }> {
  let query: FirebaseFirestore.Query = adminDb.collection('users').where('role', '==', 'JOB_SEEKER');
  if (options.limit) query = query.limit(options.limit);

  const snap = await query.get();
  let scanned = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    scanned++;
    const raw = doc.data() as Record<string, unknown>;
    const normalized = buildNormalizedCandidateProfile(doc.id, raw);
    const normSummary = summarizeNormalizedCandidate(normalized);
    const embedding = await maybeComputeEmbedding(
      buildCandidateEmbeddingText(normalized),
      options.withEmbeddings
    );

    const updatePayload: Record<string, unknown> = {
      matchingNormalization: normSummary,
    };

    if (embedding) {
      updatePayload.matchingEmbedding = embedding;
      updatePayload.matchingEmbeddingUpdatedAt = new Date().toISOString();
    }

    if (options.dryRun) {
      console.log(
        `[candidates][dry-run] ${doc.id} roles=${normalized.normalizedRoles.length} skills=${normalized.normalizedSkills.length} industries=${normalized.normalizedIndustries.length} embedding=${embedding ? 'yes' : 'no'}`
      );
    } else {
      await doc.ref.set(updatePayload, { merge: true });
      console.log(`[candidates][write] updated ${doc.id}`);
      updated++;
    }
  }

  return { scanned, updated: options.dryRun ? scanned : updated };
}

async function rerunJobMatches(options: CliOptions): Promise<void> {
  if (!options.jobId) {
    throw new Error('`--jobId=<id>` is required for --mode=job-matches');
  }
  if (options.dryRun) {
    console.log(`[job-matches][dry-run] would rerun matching for job ${options.jobId}`);
    return;
  }
  await runJobMatching(adminDb as any, options.jobId);
  console.log(`[job-matches][write] reran matching for job ${options.jobId}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log('[backfill] starting with options:', {
    ...options,
    note: options.dryRun ? 'dry-run (no writes)' : 'write mode (merge updates)',
  });

  if (options.mode === 'job-matches' && !options.jobId) {
    throw new Error('For --mode=job-matches you must pass --jobId=<jobId>');
  }

  if (options.mode === 'all' || options.mode === 'jobs') {
    const out = await backfillJobs(options);
    console.log('[backfill] jobs done:', out);
  }

  if (options.mode === 'all' || options.mode === 'candidates') {
    const out = await backfillCandidates(options);
    console.log('[backfill] candidates done:', out);
  }

  if (options.mode === 'job-matches') {
    await rerunJobMatches(options);
  } else if (options.mode === 'all' && options.jobId) {
    await rerunJobMatches(options);
  }

  console.log('[backfill] complete');
}

main().catch((err) => {
  console.error('[backfill] failed:', err);
  process.exit(1);
});
