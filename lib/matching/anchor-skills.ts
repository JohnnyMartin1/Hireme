/**
 * Domain anchor skills: must-have signals for specialized roles.
 * Generic tokens are down-weighted; anchors drive gating and caps.
 */

import { dedupeSkillList, normalizeWhitespaceLower, skillCompareKey } from '@/lib/matching/normalize-terms';
import { SPECIALIZED_ROLE_CONFIG } from '@/lib/matching/role-taxonomy';

/** Minimal job shape for anchor extraction (avoids circular imports with scoring). */
export type AnchorJobLike = {
  canonicalRole?: string | null;
  domainKeywords?: string[];
  anchorSkills?: string[];
};

/** Substrings that alone should not count as domain evidence. */
const GENERIC_ANCHOR_BLOCKLIST = new Set([
  'design',
  'analysis',
  'analytical',
  'creative',
  'communication',
  'team',
  'collaboration',
  'leadership',
  'detail',
  'oriented',
  'problem solving',
  'fast paced',
  'multitask',
]);

export function isGenericAnchorToken(key: string): boolean {
  const k = normalizeWhitespaceLower(key);
  if (k.length < 4) return true;
  return GENERIC_ANCHOR_BLOCKLIST.has(k);
}

const DEFAULT_ANCHORS_BY_ROLE: Record<string, string[]> = {
  fashion_designer: [
    'fashion design',
    'apparel design',
    'garment',
    'technical sketch',
    'illustrator',
    'adobe illustrator',
    'photoshop',
    'textile',
    'fit',
    'trend',
    'flats',
    'spec',
  ],
  financial_analyst: [
    'financial modeling',
    'dcf',
    'valuation',
    'excel',
    'forecast',
    'budget',
    'financial statement',
    'p&l',
    'variance analysis',
    'market research',
  ],
  data_analyst: [
    'sql',
    'tableau',
    'power bi',
    'python',
    'dashboard',
    'etl',
    'data visualization',
    'metrics',
  ],
  software_engineer: [
    'javascript',
    'typescript',
    'python',
    'java',
    'react',
    'node',
    'api',
    'git',
    'testing',
    'ci/cd',
  ],
  product_designer: ['figma', 'prototype', 'user research', 'wireframe', 'ux', 'product design'],
  ux_designer: ['figma', 'user research', 'usability', 'wireframe', 'prototype', 'information architecture'],
  graphic_designer: ['illustrator', 'photoshop', 'indesign', 'brand', 'layout', 'typography'],
};

/**
 * Build ordered anchor list for a job: explicit job.anchorSkills, specialized defaults, domain keywords (filtered).
 */
export function buildAnchorSkillList(job: AnchorJobLike, explicitAnchors?: string[] | null): string[] {
  const fromJob = Array.isArray(explicitAnchors)
    ? explicitAnchors
    : Array.isArray(job.anchorSkills)
      ? job.anchorSkills
      : [];

  const role = job.canonicalRole || 'generalist';
  const defaults = DEFAULT_ANCHORS_BY_ROLE[role] || [];
  const cfg = SPECIALIZED_ROLE_CONFIG[role];
  const fromStrong = cfg?.strongSignals || [];

  const domainFiltered = (job.domainKeywords || [])
    .map((s) => String(s))
    .filter((s) => skillCompareKey(s).length >= 4 && !isGenericAnchorToken(skillCompareKey(s)));

  return dedupeSkillList([...fromJob, ...defaults, ...fromStrong, ...domainFiltered]).slice(0, 24);
}

export type AnchorCoverageResult = {
  score: number;
  matchedAnchors: string[];
  missingAnchors: string[];
  coverageRatio: number;
};

/**
 * Overlap of anchor phrases against high-trust candidate text (identity + experience, not prefs alone).
 */
export function scoreAnchorCoverage(
  anchors: string[],
  identityHay: string,
  experienceHay: string
): AnchorCoverageResult {
  const needles = dedupeSkillList(anchors)
    .map((s) => skillCompareKey(s))
    .filter((k) => k.length >= 4 && !isGenericAnchorToken(k));
  if (!needles.length) {
    return { score: 70, matchedAnchors: [], missingAnchors: [], coverageRatio: 1 };
  }
  const high = normalizeWhitespaceLower(identityHay);
  const med = normalizeWhitespaceLower(experienceHay);
  const matched: string[] = [];
  for (const n of needles) {
    if (high.includes(n) || med.includes(n)) matched.push(n);
  }
  const ratio = matched.length / needles.length;
  const score = Math.round(ratio * 100);
  const missing = needles.filter((n) => !matched.includes(n)).slice(0, 12);
  return {
    score,
    matchedAnchors: matched.slice(0, 12),
    missingAnchors: missing,
    coverageRatio: ratio,
  };
}
