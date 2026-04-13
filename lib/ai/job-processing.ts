import type { ProcessedJobContent } from '@/types/matching';
import { parseJobPosting, heuristicParseJob } from '@/lib/ai/parse-job';
export function heuristicJobProcessing(input: {
  title: string;
  description: string;
  tags: string[];
  industry?: string | null;
}): ProcessedJobContent {
  return heuristicParseJob({
    title: input.title,
    description: input.description,
    tags: input.tags,
    industry: input.industry,
  });
}

/**
 * Backward-compatible wrapper. Canonical parser now lives in `lib/ai/parse-job.ts`.
 */
export async function processJobContent(input: {
  title: string;
  description: string;
  tags: string[];
  industry?: string | null;
}): Promise<ProcessedJobContent> {
  return parseJobPosting({
    title: input.title,
    description: input.description,
    tags: input.tags,
    industry: input.industry,
  });
}
