import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { runJobMatching, jobDocToScoringPayload } from '@/lib/matching/job-matching';
import { buildNormalizedCandidateProfile } from '@/lib/matching/candidate-profile';
import { scoreCandidateAgainstJob } from '@/lib/matching/scoring';
import {
  getOrCreateCandidateEmbedding,
  getOrCreateJobEmbedding,
  semanticScoreFromStoredEmbeddings,
} from '@/lib/matching/embeddings';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Not available outside development' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const run = searchParams.get('run') === '1';
    const names = (searchParams.get('names') || 'Jack Garrettson,John Martin')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });

    if (run) {
      await runJobMatching(adminDb, jobId);
    }

    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    const job = jobSnap.data() as Record<string, unknown>;
    const scoringJob = jobDocToScoringPayload(job);
    const jobEmbedding = await getOrCreateJobEmbedding(adminDb, jobId, job, scoringJob);

    const usersSnap = await adminDb.collection('users').where('role', '==', 'JOB_SEEKER').get();
    const wanted = new Set(names.map((n) => n.toLowerCase()));
    const candidates: Array<Record<string, unknown>> = [];
    const seenName = new Set<string>();
    for (const d of usersSnap.docs) {
      const data = d.data() as Record<string, unknown>;
      const name = `${String(data.firstName || '').trim()} ${String(data.lastName || '').trim()}`.trim();
      if (!wanted.has(name.toLowerCase())) continue;
      if (seenName.has(name.toLowerCase())) continue;
      seenName.add(name.toLowerCase());
      const normalized = buildNormalizedCandidateProfile(d.id, data);
      const candidateEmbedding = await getOrCreateCandidateEmbedding(adminDb, d.id, data, normalized);
      const semanticScore = semanticScoreFromStoredEmbeddings(jobEmbedding, candidateEmbedding);
      const scores = scoreCandidateAgainstJob(scoringJob, normalized, { semanticScore });
      candidates.push({
        candidateId: d.id,
        candidateName: name,
        overallScore: scores.overallScore,
        semanticScore: scores.semanticScore,
        skillsScore: scores.skillsScore,
        titleScore: scores.titleScore,
        locationScore: scores.locationScore,
        gpaScore: scores.gpaScore,
        industryScore: scores.industryScore,
        preferenceScore: scores.preferenceScore,
        debug: scores.debug,
      });
    }

    return NextResponse.json({
      jobId,
      parserSelected: job.aiProcessingSource || 'unknown',
      parsedJobAtScoringTime: {
        title: scoringJob.title,
        normalizedTitle: scoringJob.normalizedTitle,
        canonicalRole: scoringJob.canonicalRole || 'unknown',
        roleFamily: scoringJob.roleFamily || 'unknown',
        roleSpecialization: scoringJob.roleSpecialization || 'unknown',
        hardRequirements: scoringJob.hardRequirements || [],
        requiredTools: scoringJob.requiredTools || [],
        domainKeywords: scoringJob.domainKeywords || [],
        anchorSkills: scoringJob.anchorSkills || [],
        requiredSkills: scoringJob.requiredSkills || [],
        preferredSkills: scoringJob.preferredSkills || [],
      },
      formula: {
        weightedBase:
          '0.23*specialization + 0.20*anchors + 0.20*experience + 0.12*domainIndustry + 0.08*skills + 0.07*tools + 0.04*major + 0.03*gpa + 0.05*location + 0.02*jobType + 0.02*auth + 0.04*readiness',
        penalties: 'LOW family -26; MEDIUM same-family -12; MEDIUM_HIGH adjacent -5; explicit unrelated -30',
        caps: 'specialized must-have groups; anchor<20%; creative portfolio; unrelated role; eligibility floors',
        semanticBlend: 'guarded 0.06 max, reduced for weak_domain_fit / LOW+specialized',
      },
      candidates,
    });
  } catch (error) {
    console.error('[debug/match-trace] failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

