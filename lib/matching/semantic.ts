function isFiniteVector(v: unknown): v is number[] {
  return Array.isArray(v) && v.length > 0 && v.every((n) => Number.isFinite(Number(n)));
}

function cosineSimilarity(a: number[], b: number[]): number | null {
  if (!a.length || !b.length) return null;
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < n; i++) {
    const x = Number(a[i]);
    const y = Number(b[i]);
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA <= 0 || normB <= 0) return null;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Convert cosine [-1, 1] to [0, 100] semantic score.
 * Uses a conservative clamp window to reduce sensitivity to noise.
 */
function cosineToScore(cosine: number): number {
  const clamped = Math.max(-0.2, Math.min(1, cosine));
  return Math.round(((clamped + 0.2) / 1.2) * 100);
}

export function computeSemanticSimilarityFromEmbeddings(
  jobEmbedding: number[] | null,
  candidateEmbedding: number[] | null
): number | null {
  if (!isFiniteVector(jobEmbedding) || !isFiniteVector(candidateEmbedding)) return null;
  const cosine = cosineSimilarity(jobEmbedding, candidateEmbedding);
  if (cosine == null || !Number.isFinite(cosine)) return null;
  return Math.max(0, Math.min(100, cosineToScore(cosine)));
}

/**
 * Convenience path when vectors are not precomputed/stored.
 * Returns null on missing API key or provider errors.
 */
export async function computeSemanticSimilarityScore(
  jobText: string,
  candidateText: string
): Promise<number | null> {
  const { getOpenAiEmbedding } = await import('@/lib/ai/openai-embeddings');
  const [jobEmbedding, candidateEmbedding] = await Promise.all([
    getOpenAiEmbedding(jobText),
    getOpenAiEmbedding(candidateText),
  ]);
  return computeSemanticSimilarityFromEmbeddings(jobEmbedding, candidateEmbedding);
}
