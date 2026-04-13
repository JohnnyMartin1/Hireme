import { adminDb } from '../lib/firebase-admin';
import { runJobMatching, jobDocToScoringPayload } from '../lib/matching/job-matching';
import { buildNormalizedCandidateProfile } from '../lib/matching/candidate-profile';

function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v.toMillis === 'function') return v.toMillis();
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

async function main() {
  const jobsSnap = await adminDb.collection('jobs').limit(120).get();
  const jobs = jobsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Array<
    { id: string } & Record<string, unknown>
  >;
  const sorted = jobs.sort((a, b) => toMillis((b as any).createdAt || (b as any).postedDate) - toMillis((a as any).createdAt || (a as any).postedDate));
  const designerJob =
    sorted.find((j: any) => String(j.title || '').toLowerCase().includes('designer')) ||
    sorted[0];

  if (!designerJob) {
    console.log('No jobs found.');
    return;
  }

  console.log('Using job:', designerJob.id, String((designerJob as any).title || ''));
  await runJobMatching(adminDb as any, designerJob.id);

  const refreshed = await adminDb.collection('jobs').doc(designerJob.id).get();
  const job = refreshed.data() as Record<string, unknown>;
  const normalizedJob = jobDocToScoringPayload(job);
  console.log('\n=== Normalized Job Object ===');
  console.log(
    JSON.stringify(
      {
        id: designerJob.id,
        title: job.title,
        normalizedTitle: job.normalizedTitle,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        keywords: job.keywords,
        minGpa: job.minGpa,
        normalizedForScoring: normalizedJob,
      },
      null,
      2
    )
  );

  const matchSnap = await adminDb
    .collection('jobMatches')
    .where('jobId', '==', designerJob.id)
    .orderBy('overallScore', 'desc')
    .limit(5)
    .get();

  console.log('\n=== Top Matches (debug sample) ===');
  for (const d of matchSnap.docs) {
    const m = d.data() as Record<string, any>;
    const candSnap = await adminDb.collection('users').doc(String(m.candidateId)).get();
    const candData = candSnap.data() as Record<string, unknown>;
    const normalizedCandidate = buildNormalizedCandidateProfile(String(m.candidateId), candData);
    console.log(
      JSON.stringify(
        {
          matchId: d.id,
          candidateId: m.candidateId,
          overallScore: m.overallScore,
          skillsScore: m.skillsScore,
          titleScore: m.titleScore,
          locationScore: m.locationScore,
          industryScore: m.industryScore,
          preferenceScore: m.preferenceScore,
          scoreDebug: m.scoreDebug || null,
          explanation: m.explanation,
          normalizedCandidate: {
            displayName: normalizedCandidate.displayName,
            desiredRolesText: normalizedCandidate.desiredRolesText,
            roleSignals: normalizedCandidate.roleSignals.slice(0, 20),
            skills: normalizedCandidate.skills.slice(0, 20),
            inferredSkills: normalizedCandidate.inferredSkills.slice(0, 20),
            mergedSkills: normalizedCandidate.mergedSkills.slice(0, 25),
            matchingTextSnippet: normalizedCandidate.matchingText.slice(0, 350),
          },
        },
        null,
        2
      )
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

