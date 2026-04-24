import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { buildNormalizedCandidateProfile } from '@/lib/matching/candidate-profile';
import {
  scoreCandidateAgainstJob,
  parseMinGpa,
  buildScoreDebugLines,
  type JobForScoring,
} from '@/lib/matching/scoring';
import { buildMatchExplanation } from '@/lib/matching/explanations';
import { calculateCompletion } from '@/lib/profile-completion';
import { dedupeSkillList, normalizeKeywordList } from '@/lib/matching/normalize-terms';
import {
  getOrCreateCandidateEmbedding,
  getOrCreateJobEmbedding,
  semanticScoreFromStoredEmbeddings,
} from '@/lib/matching/embeddings';
import { parseJobPostingDetailed } from '@/lib/ai/parse-job';
import { resolveCanonicalRoleKey } from '@/lib/matching/role-taxonomy';

const MAX_CANDIDATES = 400;

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)).filter((item) => item !== undefined) as T;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefinedDeep(v)]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

export function jobDocToScoringPayload(job: Record<string, unknown>): JobForScoring {
  const title = String(job.title || '');
  const normalizedTitle = (job.normalizedTitle as string) || null;
  const descForRole = String(job.description || '').slice(0, 12000);
  const roleResolved = resolveCanonicalRoleKey(
    (job.canonicalRole as string) || ((job.jobNormalization as any)?.canonicalRole as string) || null,
    `${normalizedTitle || ''} ${title} ${descForRole}`
  );
  const pickArray = (top: unknown, nested: unknown): string[] => {
    const a = Array.isArray(top) ? (top as string[]).map(String).filter(Boolean) : [];
    if (a.length) return a;
    const b = Array.isArray(nested) ? (nested as string[]).map(String).filter(Boolean) : [];
    return b;
  };
  const tags = Array.isArray(job.tags) ? (job.tags as string[]) : [];
  const mustHaves = Array.isArray(job.mustHaves) ? (job.mustHaves as string[]) : [];
  const rawRequired = Array.isArray(job.requiredSkills)
    ? (job.requiredSkills as string[])
    : mustHaves.length
      ? mustHaves
      : tags;
  const requiredSkills = dedupeSkillList(rawRequired.map((s) => String(s)));
  const preferredSkills = dedupeSkillList(
    [
      ...(Array.isArray(job.preferredSkills) ? (job.preferredSkills as string[]).map(String) : []),
      ...(Array.isArray(job.preferredSkillsStructured) ? (job.preferredSkillsStructured as string[]).map(String) : []),
    ]
  );
  const requiredSkillsStructured = Array.isArray(job.requiredSkillsStructured)
    ? (job.requiredSkillsStructured as string[]).map(String)
    : [];
  const rawKw = Array.isArray(job.keywords)
    ? (job.keywords as string[]).map(String)
    : Array.isArray(job.roleAliases)
      ? (job.roleAliases as string[]).map(String)
      : [];
  const keywords = normalizeKeywordList(
    rawKw.length ? rawKw : tags.flatMap((t) => t.split(/[\s,]+/).filter(Boolean)),
    40
  );

  const minGpa =
    parseMinGpa(job.minGpa) ??
    parseMinGpa(job.requiredGpa);

  return {
    title,
    normalizedTitle,
    canonicalRole: roleResolved.canonicalRole,
    roleFamily: roleResolved.roleFamily,
    roleSpecialization: roleResolved.roleSpecialization,
    hardRequirements: (() => {
      const parsed = pickArray(job.hardRequirements, (job.jobNormalization as any)?.hardRequirements);
      if (parsed.length) return parsed;
      const fallback = dedupeSkillList([
        ...requiredSkills,
        ...mustHaves.map(String),
        ...(Array.isArray(job.minimumQualifications)
          ? (job.minimumQualifications as string[]).map(String)
          : []),
      ]);
      return fallback.slice(0, 16);
    })(),
    softRequirements: pickArray(job.softRequirements, (job.jobNormalization as any)?.softRequirements),
    requiredTools: pickArray(job.requiredTools, (job.jobNormalization as any)?.requiredTools),
    domainKeywords: pickArray(job.domainKeywords, (job.jobNormalization as any)?.domainKeywords),
    experienceRequirements: pickArray(
      job.experienceRequirements,
      (job.jobNormalization as any)?.experienceRequirements
    ),
    educationRequirements: pickArray(
      job.educationRequirements,
      (job.jobNormalization as any)?.educationRequirements
    ),
    requiredSkills: dedupeSkillList([...requiredSkills, ...requiredSkillsStructured]),
    preferredSkills,
    keywords: keywords.length ? keywords : normalizeKeywordList(tags, 40),
    locationCity: String(job.locationCity || ''),
    locationState: String(job.locationState || ''),
    location: (job.location as string) || null,
    workMode: (job.workMode as string) || null,
    employment: (job.employment as string) || (job.jobType as string) || null,
    jobType: (job.jobType as string) || (job.employment as string) || null,
    minGpaNumeric: minGpa,
    industry:
      (job.industry as string) ||
      (Array.isArray(job.industries) ? String((job.industries as string[])[0] || '') : '') ||
      null,
    requiredCareerInterests: Array.isArray(job.requiredCareerInterests)
      ? (job.requiredCareerInterests as string[])
      : [],
    functionalArea: (job.functionalArea as string) || null,
    experienceLevel: (job.experienceLevel as string) || null,
    requiredMajors: Array.isArray(job.requiredMajors) ? (job.requiredMajors as string[]).map(String) : [],
    preferredMajors: Array.isArray(job.preferredMajors) ? (job.preferredMajors as string[]).map(String) : [],
    sponsorshipAccepted:
      typeof job.sponsorshipAccepted === 'boolean' ? (job.sponsorshipAccepted as boolean) : null,
    relocationAccepted:
      typeof job.relocationAccepted === 'boolean' ? (job.relocationAccepted as boolean) : null,
    description: descForRole || null,
    anchorSkills: dedupeSkillList(
      [
        ...(Array.isArray(job.anchorSkills) ? (job.anchorSkills as string[]) : []),
        ...(((job.jobNormalization as Record<string, unknown> | undefined)?.anchorSkills as string[]) || []),
      ].map(String)
    ).slice(0, 24),
  };
}

async function deleteExistingMatches(db: Firestore, jobId: string): Promise<void> {
  const snap = await db.collection('jobMatches').where('jobId', '==', jobId).get();
  const batchSize = 400;
  let batch = db.batch();
  let n = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    n++;
    if (n >= batchSize) {
      await batch.commit();
      batch = db.batch();
      n = 0;
    }
  }
  if (n > 0) await batch.commit();
}

/**
 * Run full matching for a job: score eligible candidates and write `jobMatches` docs.
 */
export async function runJobMatching(db: Firestore, jobId: string): Promise<void> {
  const jobRef = db.collection('jobs').doc(jobId);
  const jobSnap = await jobRef.get();
  if (!jobSnap.exists) {
    throw new Error('Job not found');
  }
  const job = jobSnap.data() as Record<string, unknown>;
  const employerId = String(job.employerId || '');

  await jobRef.update({
    matchStatus: 'pending',
    matchError: FieldValue.delete(),
    updatedDate: new Date().toISOString(),
  });

  try {
    // Runtime normalization refresh for legacy jobs so rerun uses latest parser fields.
    const canonicalRaw = String(job.canonicalRole || '').trim();
    const roleFamilyRaw = String(job.roleFamily || '').trim().toLowerCase();
    const roleSpecRaw = String(job.roleSpecialization || '').trim().toLowerCase();
    const hardReqRaw = Array.isArray(job.hardRequirements) ? (job.hardRequirements as string[]) : [];
    const toolsRaw = Array.isArray(job.requiredTools) ? (job.requiredTools as string[]) : [];
    const domainRaw = Array.isArray(job.domainKeywords) ? (job.domainKeywords as string[]) : [];
    const titleDescForRole = `${String(job.normalizedTitle || '')} ${String(job.title || '')} ${String(job.description || '').slice(0, 12000)}`.trim();
    const roleFromTitleDescription = resolveCanonicalRoleKey('', titleDescForRole);
    const generalistNeedsRefresh =
      canonicalRaw.toLowerCase() === 'generalist' && roleFromTitleDescription.canonicalRole !== 'generalist';

    const needsNormalizationRefresh =
      !canonicalRaw ||
      canonicalRaw.toLowerCase() === 'unknown' ||
      roleFamilyRaw === 'unknown' ||
      roleSpecRaw === 'unknown' ||
      hardReqRaw.length === 0 ||
      toolsRaw.length === 0 ||
      domainRaw.length === 0 ||
      !(job.jobNormalization && typeof job.jobNormalization === 'object') ||
      generalistNeedsRefresh;

    let runtimeJob = { ...job } as Record<string, unknown>;
    if (needsNormalizationRefresh) {
      const title = String(job.title || '');
      const description = String(job.description || '');
      const tags = Array.isArray(job.tags) ? (job.tags as string[]).map(String) : [];
      const parsed = await parseJobPostingDetailed({
        title,
        description,
        tags,
        location: (job.location as string) || null,
        locationCity: (job.locationCity as string) || null,
        locationState: (job.locationState as string) || null,
        jobType: ((job.jobType as string) || (job.employment as string) || null) as string | null,
        minGpa: (job.minGpa as string) || (job.requiredGpa as string) || null,
        industry: (job.industry as string) || null,
        experienceLevel: (job.experienceLevel as string) || null,
        functionalArea: (job.functionalArea as string) || null,
        requiredSkillsStructured: Array.isArray(job.requiredSkillsStructured)
          ? (job.requiredSkillsStructured as string[])
          : [],
        preferredSkillsStructured: Array.isArray(job.preferredSkillsStructured)
          ? (job.preferredSkillsStructured as string[])
          : [],
        requiredMajors: Array.isArray(job.requiredMajors) ? (job.requiredMajors as string[]) : [],
        preferredMajors: Array.isArray(job.preferredMajors) ? (job.preferredMajors as string[]) : [],
        sponsorshipAccepted:
          typeof job.sponsorshipAccepted === 'boolean'
            ? (job.sponsorshipAccepted as boolean)
            : null,
        relocationAccepted:
          typeof job.relocationAccepted === 'boolean'
            ? (job.relocationAccepted as boolean)
            : null,
      });
      const normalizationUpdate = {
        normalizedTitle: parsed.processed.normalizedTitle,
        canonicalRole: parsed.processed.canonicalRole,
        roleFamily: parsed.processed.roleFamily,
        roleSpecialization: parsed.processed.roleSpecialization,
        hardRequirements: parsed.processed.hardRequirements,
        softRequirements: parsed.processed.softRequirements,
        requiredTools: parsed.processed.requiredTools,
        domainKeywords: parsed.processed.domainKeywords,
        experienceRequirements: parsed.processed.experienceRequirements,
        educationRequirements: parsed.processed.educationRequirements,
        anchorSkills: parsed.processed.anchorSkills,
        jobNormalization: parsed.processed,
        aiProcessingSource: parsed.aiProcessingSource,
      };
      await jobRef.update(stripUndefinedDeep(normalizationUpdate));
      runtimeJob = { ...runtimeJob, ...normalizationUpdate };

      if (process.env.NODE_ENV === 'development') {
        console.info('[match-runtime][parser]', {
          jobId,
          parserSelected: parsed.aiProcessingSource,
          canonicalRole: parsed.processed.canonicalRole,
          roleFamily: parsed.processed.roleFamily,
          roleSpecialization: parsed.processed.roleSpecialization,
          hardRequirements: parsed.processed.hardRequirements,
          requiredTools: parsed.processed.requiredTools,
          domainKeywords: parsed.processed.domainKeywords,
        });
      }
    }

    await deleteExistingMatches(db, jobId);

    const usersSnap = await db.collection('users').where('role', '==', 'JOB_SEEKER').get();

    const scoringJob = jobDocToScoringPayload(runtimeJob);
    const jobEmbedding = await getOrCreateJobEmbedding(db, jobId, runtimeJob, scoringJob);
    if (process.env.NODE_ENV === 'development') {
      console.info('[match-runtime][job-scoring-payload]', {
        jobId,
        title: scoringJob.title,
        normalizedTitle: scoringJob.normalizedTitle,
        canonicalRole: scoringJob.canonicalRole,
        roleFamily: scoringJob.roleFamily,
        roleSpecialization: scoringJob.roleSpecialization,
        hardRequirements: scoringJob.hardRequirements,
        requiredTools: scoringJob.requiredTools,
          domainKeywords: scoringJob.domainKeywords,
          anchorSkills: scoringJob.anchorSkills,
        formula:
          'weighted blend of specialization, anchors, experience, domain, skills, tools, major, GPA, location, prefs, auth, readiness; penalties; caps; eligibility floor; guarded semantic',
      });
    }
    const nowIso = new Date().toISOString();

    let batch = db.batch();
    let writes = 0;

    for (const doc of usersSnap.docs) {
      if (writes >= MAX_CANDIDATES) break;

      const data = doc.data() as Record<string, unknown>;
      const email = String(data.email || '');
      const fn = String(data.firstName || '');
      const ln = String(data.lastName || '');
      if (!email || !fn || !ln) continue;

      if (data.openToOpp === false) continue;

      const completion = calculateCompletion(data);
      if (completion < 70) continue;

      const normalized = buildNormalizedCandidateProfile(doc.id, data);
      const candidateEmbedding = await getOrCreateCandidateEmbedding(db, doc.id, data, normalized);
      const semanticScore = semanticScoreFromStoredEmbeddings(jobEmbedding, candidateEmbedding);
      const scores = scoreCandidateAgainstJob(scoringJob, normalized, { semanticScore });
      if (process.env.NODE_ENV === 'development') {
        console.info(buildScoreDebugLines(scoringJob, normalized, scores).join('\n'));
        const fullName = `${String(data.firstName || '').trim()} ${String(data.lastName || '').trim()}`.trim();
        if (fullName === 'Jack Garrettson' || fullName === 'John Martin') {
          console.info('[match-runtime][candidate-breakdown]', {
            jobId,
            candidateId: doc.id,
            candidateName: fullName,
            overallScore: scores.overallScore,
            componentScores: {
              titleScore: scores.titleScore,
              skillsScore: scores.skillsScore,
              locationScore: scores.locationScore,
              gpaScore: scores.gpaScore,
              industryScore: scores.industryScore,
              preferenceScore: scores.preferenceScore,
              semanticScore: scores.semanticScore,
            },
            penaltiesApplied: scores.debug?.penaltiesApplied || [],
            scoreCapsApplied: scores.debug?.scoreCapsApplied || [],
            formulaInputs: scores.debug?.formulaInputs || null,
            explanationPreview: undefined,
          });
        }
      }
      const { explanation, strengths, gaps, recruiterSummary } = buildMatchExplanation(
        scoringJob,
        normalized,
        scores
      );

      const matchId = `${jobId}_${doc.id}`;
      const ref = db.collection('jobMatches').doc(matchId);
      const matchPayload = stripUndefinedDeep({
        jobId,
        candidateId: doc.id,
        employerId,
        overallScore: scores.overallScore,
        semanticScore: scores.semanticScore,
        skillsScore: scores.skillsScore,
        titleScore: scores.titleScore,
        locationScore: scores.locationScore,
        gpaScore: scores.gpaScore,
        industryScore: scores.industryScore,
        preferenceScore: scores.preferenceScore,
        authorizationScore: scores.authorizationScore,
        anchorSkillScore: scores.anchorSkillScore,
        majorFitScore: scores.majorFitScore,
        scoreDebug: scores.debug,
        explanation,
        strengths,
        gaps,
        recruiterSummary,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      batch.set(ref, matchPayload);

      writes++;
      if (writes % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }

    if (writes > 0 && writes % 400 !== 0) {
      await batch.commit();
    }

    await jobRef.update({
      matchStatus: 'complete',
      matchError: FieldValue.delete(),
      matchLastRunAt: nowIso,
      updatedDate: nowIso,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await jobRef.update({
      matchStatus: 'failed',
      matchError: msg.slice(0, 500),
      matchLastRunAt: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
    });
    throw e;
  }
}
