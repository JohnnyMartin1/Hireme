import 'server-only';
import { getOpenAiConfig, openAiRequest } from '@/lib/ai/openai';

/**
 * Optional embeddings helper.
 * Returns null when OpenAI isn't configured or call fails so ranking fallback remains intact.
 */
export async function getOpenAiEmbedding(
  text: string,
  options?: { model?: string; timeoutMs?: number }
): Promise<number[] | null> {
  const cfg = getOpenAiConfig();
  if (!cfg.apiKey) return null;
  const input = String(text || '').trim();
  if (!input) return null;

  const req = await openAiRequest<{
    data?: Array<{ embedding?: number[] }>;
  }>(
    '/embeddings',
    {
      model: options?.model || cfg.embeddingModel,
      input: input.slice(0, 12000),
    },
    { timeoutMs: options?.timeoutMs }
  );

  if (!req.ok) return null;
  const emb = req.data.data?.[0]?.embedding;
  return Array.isArray(emb) ? emb : null;
}

export async function getOpenAiEmbeddings(
  texts: string[],
  options?: { model?: string; timeoutMs?: number }
): Promise<number[][] | null> {
  const cfg = getOpenAiConfig();
  if (!cfg.apiKey) return null;
  const inputs = texts.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 64);
  if (!inputs.length) return null;

  const req = await openAiRequest<{
    data?: Array<{ embedding?: number[] }>;
  }>(
    '/embeddings',
    {
      model: options?.model || cfg.embeddingModel,
      input: inputs.map((s) => s.slice(0, 12000)),
    },
    { timeoutMs: options?.timeoutMs }
  );
  if (!req.ok) return null;
  const vectors = (req.data.data || [])
    .map((row) => (Array.isArray(row.embedding) ? row.embedding : null))
    .filter((v): v is number[] => Array.isArray(v));
  return vectors.length ? vectors : null;
}

