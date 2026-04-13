/**
 * Shared normalization for skills, keywords, and tags used in job processing + matching.
 * Prevents single-character garbage (e.g. "r" from sloppy substring checks) from entering pipelines.
 */

/** Single-letter tokens we allow only when matched as whole words elsewhere (see job-processing). */
export const ALLOWED_SINGLE_CHAR_SKILLS = new Set<string>([]);

const PUNCT_EDGE = /^[\s"'([{]+|[\s"')\]}.,:;!?]+$/g;

/**
 * Lowercase, trim, collapse whitespace, strip common punctuation artifacts.
 */
export function normalizeWhitespaceLower(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .toLowerCase();
}

/**
 * Strip leading/trailing punctuation from a token/phrase.
 */
export function stripPunctuationEdges(s: string): string {
  return s.replace(/^[\s\-_./,:;#"'(|)]+|[\s\-_./,:;#"'(|)]+$/g, '').trim();
}

/**
 * Returns null if the string should not be used as a skill/keyword for matching or display.
 * Rules:
 * - Empty after cleanup → drop
 * - Single character → drop (we do not allow lone "r", "c", etc. in lists; use multi-char forms like "R", "C++" from curated extraction)
 * - Two characters → allow only if both are letters/digits (e.g. "go" as substring of "golang" still handled elsewhere)
 */
export function cleanSkillPhrase(raw: string): string | null {
  if (raw == null) return null;
  let t = stripPunctuationEdges(String(raw));
  t = t.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (t.length === 1) {
    if (ALLOWED_SINGLE_CHAR_SKILLS.has(t.toLowerCase())) return t;
    return null;
  }
  if (t.length === 2) {
    if (!/^[a-z0-9#+]{2}$/i.test(t)) return null;
  }
  return t;
}

/**
 * Canonical display form for matching: lower for internal compare keys, except we keep phrases as-is after trim.
 */
export function skillCompareKey(s: string): string {
  return normalizeWhitespaceLower(s);
}

/**
 * Dedupe by compare key; preserve first-seen casing for display.
 */
export function dedupeSkillList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const c = cleanSkillPhrase(raw);
    if (!c) continue;
    const key = skillCompareKey(c);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/**
 * Filter keyword tokens from free text (min length 3 to avoid "the", "and" noise — stopwords could be added later).
 */
const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'you',
  'our',
  'are',
  'will',
  'this',
  'that',
  'from',
  'have',
  'has',
  'was',
  'were',
  'been',
  'being',
  'your',
  'their',
  'they',
  'what',
  'when',
  'where',
  'which',
  'who',
  'how',
  'all',
  'any',
  'but',
  'not',
  'can',
  'may',
  'must',
  'into',
  'about',
  'more',
  'some',
  'such',
  'than',
  'then',
  'there',
  'these',
  'those',
  'very',
  'also',
  'just',
  'only',
  'other',
]);

export function cleanKeywordToken(w: string): string | null {
  const t = stripPunctuationEdges(normalizeWhitespaceLower(w));
  if (!t || t.length < 3) return null;
  if (STOPWORDS.has(t)) return null;
  if (/^\d+$/.test(t)) return null;
  return t;
}

/**
 * Build deduped keyword list from raw tokens.
 */
export function normalizeKeywordList(tokens: string[], max = 30): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of tokens) {
    const k = cleanKeywordToken(w);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * True if skill phrase is safe to show in recruiter-facing strengths (no 1–2 char noise).
 */
export function isPresentableSkillLabel(s: string): boolean {
  const t = String(s).trim();
  if (t === 'R' || t === 'C++' || t === 'C#') return true;
  const c = cleanSkillPhrase(s);
  if (!c) return false;
  if (c.length < 2) return false;
  if (c.length === 2 && !/^[a-z]{2}$/i.test(c)) return false;
  return true;
}
