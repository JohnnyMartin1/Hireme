import type { Firestore } from 'firebase-admin/firestore';
import type { JobForScoring } from '@/lib/matching/scoring';
import type { NormalizedCandidateProfile } from '@/types/matching';
import { computeSemanticSimilarityFromEmbeddings } from '@/lib/matching/semantic';

type Vector = number[];

function isFiniteVector(v: unknown): v is Vector {
  return Array.isArray(v) && v.length > 0 && v.every((n) => Number.isFinite(Number(n)));
}

export function buildJobEmbeddingText(job: JobForScoring): string {
  return [
    job.normalizedTitle || job.title,
    (job.anchorSkills || []).join(', '),
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

export function buildCandidateEmbeddingText(candidate: NormalizedCandidateProfile): string {
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

export async function getOrCreateJobEmbedding(
  db: Firestore,
  jobId: string,
  jobDoc: Record<string, unknown>,
  scoringJob: JobForScoring
): Promise<Vector | null> {
  const existing = jobDoc.embedding;
  if (isFiniteVector(existing)) return existing;

  const embeddingText = buildJobEmbeddingText(scoringJob);
  const { getOpenAiEmbedding } = await import('@/lib/ai/openai-embeddings');
  const vector = await getOpenAiEmbedding(embeddingText);
  if (!isFiniteVector(vector)) return null;

  try {
    await db.collection('jobs').doc(jobId).update({
      embedding: vector,
      embeddingUpdatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[matching] failed to persist job embedding:', jobId, err);
  }
  return vector;
}

export async function getOrCreateCandidateEmbedding(
  db: Firestore,
  candidateId: string,
  candidateDoc: Record<string, unknown>,
  normalized: NormalizedCandidateProfile
): Promise<Vector | null> {
  const existing = candidateDoc.matchingEmbedding;
  if (isFiniteVector(existing)) return existing;

  const embeddingText = buildCandidateEmbeddingText(normalized);
  const { getOpenAiEmbedding } = await import('@/lib/ai/openai-embeddings');
  const vector = await getOpenAiEmbedding(embeddingText);
  if (!isFiniteVector(vector)) return null;

  try {
    await db.collection('users').doc(candidateId).set(
      {
        matchingEmbedding: vector,
        matchingEmbeddingUpdatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[matching] failed to persist candidate embedding:', candidateId, err);
  }
  return vector;
}

export function semanticScoreFromStoredEmbeddings(
  jobEmbedding: Vector | null,
  candidateEmbedding: Vector | null
): number | null {
  return computeSemanticSimilarityFromEmbeddings(jobEmbedding, candidateEmbedding);
}
