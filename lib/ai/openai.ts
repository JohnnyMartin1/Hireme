import 'server-only';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_TIMEOUT_MS = 15000;

export type OpenAiConfig = {
  apiKey: string | null;
  model: string;
  embeddingModel: string;
  timeoutMs: number;
};

export function getOpenAiConfig(): OpenAiConfig {
  return {
    apiKey: process.env.OPENAI_API_KEY?.trim() || null,
    model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
    embeddingModel:
      process.env.OPENAI_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small',
    timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
  };
}

/** Safe gate for server-side features that optionally use OpenAI. */
export function isOpenAiConfigured(): boolean {
  return Boolean(getOpenAiConfig().apiKey);
}

type OpenAiRequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

/**
 * Core server-only OpenAI fetch wrapper with timeout + safe error handling.
 * Returns structured error info instead of throwing so callers can keep fallbacks.
 */
export async function openAiRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
  options?: { timeoutMs?: number }
): Promise<OpenAiRequestResult<T>> {
  const cfg = getOpenAiConfig();
  if (!cfg.apiKey) {
    return { ok: false, error: 'OPENAI_API_KEY not set' };
  }

  const timeoutMs = options?.timeoutMs ?? cfg.timeoutMs;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OPENAI_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const error = `OpenAI HTTP ${res.status} at ${endpoint}: ${text.slice(0, 300)}`;
      console.error('[openai] request failed', { endpoint, status: res.status });
      return { ok: false, error, status: res.status };
    }

    const json = (await res.json()) as T;
    return { ok: true, data: json };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.name === 'AbortError'
          ? `OpenAI timeout after ${timeoutMs}ms`
          : err.message
        : String(err);
    console.error('[openai] request exception', { endpoint, message });
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

