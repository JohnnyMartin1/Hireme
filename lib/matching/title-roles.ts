/**
 * Title / role normalization for matching: synonyms and canonical role families.
 * Improves titleScore when job title wording differs from candidate headline (e.g. "Designer" vs "UX").
 */

import { normalizeWhitespaceLower } from '@/lib/matching/normalize-terms';

/** Canonical bucket → related terms (all lowercase for matching). */
export const ROLE_FAMILY_TERMS: Record<string, string[]> = {
  designer: ['design', 'designer', 'ux', 'ui', 'user experience', 'user interface', 'figma', 'visual', 'graphic', 'product design'],
  engineer: ['engineer', 'engineering', 'developer', 'development', 'software', 'programmer', 'swe', 'full stack', 'fullstack', 'backend', 'back-end', 'frontend', 'front-end', 'devops', 'sre'],
  analyst: ['analyst', 'analysis', 'analytics', 'data analyst', 'business analyst', 'research analyst'],
  scientist: ['scientist', 'researcher', 'research', 'ml ', 'machine learning', 'ai ', 'nlp'],
  manager: ['manager', 'management', 'lead', 'director', 'head of', 'vp ', 'vice president'],
  consultant: ['consultant', 'consulting', 'advisory', 'advisor'],
  sales: ['sales', 'account executive', 'ae', 'business development', 'bdr', 'sdr'],
  marketing: ['marketing', 'growth', 'seo', 'content', 'brand'],
  finance: ['finance', 'financial', 'accounting', 'accountant', 'fp&a', 'treasury', 'controller'],
  hr: ['hr ', 'human resources', 'recruiter', 'recruiting', 'talent'],
  product: ['product manager', 'product management', ' pm ', 'program manager', 'project manager'],
  intern: ['intern', 'internship', 'co-op', 'coop'],
};

/**
 * Tokenize title into lowercase words (min length 2), keep multi-word phrases via full string scan.
 */
export function tokenizeTitleWords(title: string): string[] {
  const n = normalizeWhitespaceLower(title);
  return n
    .replace(/[^a-z0-9+#\s/-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
}

/**
 * Expand title into a set of matching signals: raw tokens + role family terms when any family keyword hits.
 */
export function expandTitleMatchSignals(title: string): string[] {
  const n = normalizeWhitespaceLower(title);
  const words = tokenizeTitleWords(title);
  const signals = new Set<string>();
  for (const w of words) {
    signals.add(w);
  }
  // Whole-title substring checks for multi-word phrases in ROLE_FAMILY_TERMS
  for (const terms of Object.values(ROLE_FAMILY_TERMS)) {
    for (const term of terms) {
      const t = term.trim().toLowerCase();
      if (t.length >= 2 && n.includes(t)) {
        for (const x of terms) {
          if (x.trim().length >= 2) signals.add(x.trim().toLowerCase());
        }
        break;
      }
    }
  }
  const ordered: string[] = [];
  for (const w of words) {
    if (signals.has(w)) ordered.push(w);
  }
  for (const s of signals) {
    if (!ordered.includes(s)) ordered.push(s);
  }
  return ordered.slice(0, 22);
}

/**
 * Score 0–100: share of expanded title/role signals found in candidate profile text.
 * Partial credit: at least one hit floors at 28 so a single strong signal (e.g. "engineer") is not 0.
 */
export function scoreTitleAlignment(
  jobTitle: string,
  normalizedJobTitle: string | null | undefined,
  candidateBlob: string
): number {
  const blob = normalizeWhitespaceLower(candidateBlob);
  if (!blob.trim()) return 0;

  const primary = (normalizedJobTitle || jobTitle || '').trim();
  if (!primary.trim()) return 0;

  const signals = expandTitleMatchSignals(primary);
  if (!signals.length) return 0;

  let hits = 0;
  for (const sig of signals) {
    if (sig.length < 2) continue;
    if (blob.includes(sig)) hits++;
  }

  if (hits === 0) return 0;
  const pct = Math.round((100 * hits) / signals.length);
  return Math.min(100, Math.max(28, pct));
}
