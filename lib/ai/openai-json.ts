import 'server-only';
import { getOpenAiConfig, openAiRequest } from '@/lib/ai/openai';

export async function openaiJsonCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: { model?: string; maxTokens?: number; temperature?: number; timeoutMs?: number }
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const cfg = getOpenAiConfig();
  if (!cfg.apiKey) return { ok: false, error: 'OPENAI_API_KEY not set' };

  const req = await openAiRequest<{
    choices?: Array<{ message?: { content?: string } }>;
  }>(
    '/chat/completions',
    {
      model: options?.model || cfg.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 800,
    },
    { timeoutMs: options?.timeoutMs }
  );

  if (!req.ok) return { ok: false, error: req.error };

  const content = req.data.choices?.[0]?.message?.content;
  if (!content) return { ok: false, error: 'Empty OpenAI response' };

  try {
    const parsed = JSON.parse(content) as T;
    return { ok: true, data: parsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[openai-json] JSON parse failed', { message: msg });
    return { ok: false, error: `Failed to parse OpenAI JSON response: ${msg}` };
  }
}
