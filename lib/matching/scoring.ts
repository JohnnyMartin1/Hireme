import type { NormalizedCandidateProfile } from '@/types/matching';
import { dedupeSkillList, normalizeWhitespaceLower, skillCompareKey } from '@/lib/matching/normalize-terms';
import {
  SPECIALIZED_ROLE_CONFIG,
  classifyRole,
  detectRoleFromCandidateText,
  getRoleDistance,
  resolveCanonicalRoleKey,
} from '@/lib/matching/role-taxonomy';

export interface JobForScoring {
  title: string;
  normalizedTitle?: string | null;
  canonicalRole?: string | null;
  roleFamily?: string | null;
  roleSpecialization?: string | null;
  hardRequirements?: string[];
  softRequirements?: string[];
  requiredTools?: string[];
  domainKeywords?: string[];
  experienceRequirements?: string[];
  educationRequirements?: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  keywords: string[];
  locationCity?: string;
  locationState?: string;
  location?: string | null;
  workMode?: string | null;
  employment?: string | null;
  jobType?: string | null;
  minGpaNumeric: number | null;
  industry?: string | null;
  requiredCareerInterests?: string[];
  functionalArea?: string | null;
  experienceLevel?: string | null;
  requiredMajors?: string[];
  preferredMajors?: string[];
  sponsorshipAccepted?: boolean | null;
  relocationAccepted?: boolean | null;
}

type MatchDebug = {
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedTitleSignals: string[];
  titleSignalCount: number;
  titleSignalHits: number;
  skillsReason: string;
  titleReason: string;
};

export interface SubScores {
  semanticScore: number | null;
  skillsScore: number;
  titleScore: number;
  locationScore: number;
  gpaScore: number;
  industryScore: number;
  preferenceScore: number;
}

export interface ScoreDebugData extends MatchDebug {
  relevanceGateMultiplier: number;
  semanticBlendWeight: number;
  usedSemantic: boolean;
  functionAlignmentScore?: number;
  experienceEvidenceScore?: number;
  authorizationScore?: number;
  majorAlignmentScore?: number;
  educationFitScore?: number;
  readinessScore?: number;
  primaryComposite?: number;
  secondaryComposite?: number;
  canonicalRole?: string;
  roleFamily?: string;
  roleSpecialization?: string;
  roleDistance?: string;
  roleDistanceScore?: number;
  penaltiesApplied?: string[];
  scoreCapsApplied?: string[];
  hardRequirements?: string[];
  requiredTools?: string[];
  domainKeywords?: string[];
  formulaInputs?: {
    roleDomainAlignment: number;
    hardSkillsTools: number;
    experienceEvidence: number;
    portfolioProof: number;
    educationRelevance: number;
    locationPreferencesAuth: number;
    weightedBase: number;
    afterPenalties: number;
    afterCaps: number;
    semanticBlendWeight: number;
    semanticScore: number | null;
  };
}

function norm(s: string): string {
  return normalizeWhitespaceLower(s || '');
}

function candidateText(c: NormalizedCandidateProfile): string {
  return norm(
    [
      c.headline,
      c.bio,
      c.experienceSummary,
      c.matchingText,
      c.educationSummary,
      c.extracurricularsSummary,
      ...c.targetRoles,
      ...c.normalizedRoles,
      ...c.normalizedSkills,
      ...c.structuredExperienceSignals,
      ...c.experienceKeywords,
      ...c.educationKeywords,
    ].join(' ')
  );
}

function sanitizeJobForScoring(job: JobForScoring): JobForScoring {
  const resolved = resolveCanonicalRoleKey(
    job.canonicalRole,
    `${job.normalizedTitle || job.title || ''} ${(job.domainKeywords || []).join(' ')}`
  );
  return {
    ...job,
    canonicalRole: resolved.canonicalRole,
    roleFamily: resolved.roleFamily,
    roleSpecialization: resolved.roleSpecialization,
    hardRequirements: dedupeSkillList(job.hardRequirements || []).slice(0, 20),
    softRequirements: dedupeSkillList(job.softRequirements || []).slice(0, 20),
    requiredTools: dedupeSkillList(job.requiredTools || []).slice(0, 20),
    domainKeywords: dedupeSkillList(job.domainKeywords || []).slice(0, 20),
    experienceRequirements: dedupeSkillList(job.experienceRequirements || []).slice(0, 20),
    educationRequirements: dedupeSkillList(job.educationRequirements || []).slice(0, 20),
    requiredSkills: dedupeSkillList(job.requiredSkills || []),
    preferredSkills: dedupeSkillList(job.preferredSkills || []),
    keywords: dedupeSkillList((job.keywords || []).map((k) => String(k))).filter((k) => k.length >= 2).slice(0, 40),
  };
}

function scoreDomainAlignment(job: JobForScoring, c: NormalizedCandidateProfile): {
  score: number;
  distance: string;
  reason: string;
  candidateRole: string;
} {
  const cRole = detectRoleFromCandidateText(
    [c.headline, ...c.targetRoles, ...c.normalizedRoles, c.experienceSummary].join(' ')
  );
  const rd = getRoleDistance(job.canonicalRole || 'generalist', cRole);
  return { score: rd.score, distance: rd.distance, reason: rd.reason, candidateRole: cRole };
}

function overlapScore(needles: string[], hay: string): { score: number; matched: string[]; missing: string[] } {
  const req = dedupeSkillList(needles.map((s) => skillCompareKey(s))).filter((s) => s.length >= 3);
  if (!req.length) return { score: 55, matched: [], missing: [] };
  const matched = req.filter((r) => hay.includes(r));
  return {
    score: Math.round((matched.length / req.length) * 100),
    matched,
    missing: req.filter((r) => !matched.includes(r)).slice(0, 10),
  };
}

function scoreHardRequirements(job: JobForScoring, c: NormalizedCandidateProfile): {
  score: number;
  matched: string[];
  missing: string[];
  reason: string;
} {
  const txt = candidateText(c);
  const requiredPool = dedupeSkillList([
    ...(job.requiredSkills || []),
    ...(job.hardRequirements || []),
    ...(job.requiredTools || []),
  ]);
  const core = overlapScore(requiredPool, txt);
  const preferred = overlapScore([...(job.preferredSkills || []), ...(job.softRequirements || [])], txt);
  const final = Math.round(core.score * 0.82 + preferred.score * 0.18);
  return {
    score: final,
    matched: core.matched.slice(0, 10),
    missing: core.missing.slice(0, 10),
    reason: core.matched.length ? 'hard-requirements-overlap' : 'hard-requirements-miss',
  };
}

function scoreEvidenceStrength(job: JobForScoring, c: NormalizedCandidateProfile): number {
  const high = norm(
    [c.headline, c.experienceSummary, c.matchingText, ...c.structuredExperienceSignals, ...c.experienceKeywords].join(' ')
  );
  const medium = norm([c.educationSummary, ...c.normalizedSkills, ...c.educationKeywords].join(' '));
  const low = norm([c.desiredRolesText, ...c.careerInterests, ...c.preferenceSignals].join(' '));
  const signals = dedupeSkillList([
    ...(job.requiredSkills || []),
    ...(job.requiredTools || []),
    ...(job.domainKeywords || []),
    ...(job.hardRequirements || []),
  ])
    .map(skillCompareKey)
    .filter((s) => s.length >= 3);
  if (!signals.length) return 50;
  let weightedHits = 0;
  const max = signals.length * 1.85;
  for (const s of signals) {
    if (high.includes(s)) weightedHits += 1;
    else if (medium.includes(s)) weightedHits += 0.6;
    else if (low.includes(s)) weightedHits += 0.25;
  }
  return Math.round((weightedHits / max) * 100);
}

function scorePortfolioProof(c: NormalizedCandidateProfile): number {
  const txt = candidateText(c);
  const hasPortfolioSignal =
    txt.includes('portfolio') ||
    txt.includes('behance') ||
    txt.includes('dribbble') ||
    txt.includes('case study');
  let score = hasPortfolioSignal ? 72 : 28;
  if (c.hasResume) score += 12;
  if (c.hasVideo) score += 8;
  return Math.max(0, Math.min(100, score));
}

function majorAlignmentScore(job: JobForScoring, c: NormalizedCandidateProfile): number {
  const required = dedupeSkillList(job.requiredMajors || []).map(norm).filter((x) => x.length >= 2);
  const preferred = dedupeSkillList(job.preferredMajors || []).map(norm).filter((x) => x.length >= 2);
  const educationRequired = dedupeSkillList(job.educationRequirements || []).map(norm).filter((x) => x.length >= 2);
  if (!required.length && !preferred.length && !educationRequired.length) return 60;
  const blob = norm([c.educationSummary, ...c.educationKeywords].join(' '));
  const all = dedupeSkillList([...required, ...preferred, ...educationRequired]).filter((x) => x.length >= 2);
  const hits = all.filter((x) => blob.includes(x)).length;
  return Math.round((hits / Math.max(1, all.length)) * 100);
}

function locationAndPreferenceScore(job: JobForScoring, c: NormalizedCandidateProfile): number {
  const mode = (job.workMode || '').toUpperCase();
  const location = norm(c.location);
  let locationScore = 50;
  if (mode === 'REMOTE') locationScore = location.includes('remote') ? 88 : 58;
  else {
    const city = norm(job.locationCity || '');
    const state = norm(job.locationState || '');
    if (city && location.includes(city)) locationScore = 100;
    else if (state && location.includes(state)) locationScore = 78;
    else locationScore = 34;
  }
  const employment = norm(String(job.employment || job.jobType || ''));
  const prefHit = c.jobTypes.some((t) => norm(t).includes(employment) || employment.includes(norm(t)));
  const authPenalty =
    job.sponsorshipAccepted === false && c.workAuthNeedsSponsorship === true ? 28 : 0;
  return Math.max(0, Math.min(100, Math.round(locationScore * 0.55 + (prefHit ? 85 : 40) * 0.45 - authPenalty)));
}

function applyDomainPenalties(
  job: JobForScoring,
  candidateRole: string,
  baseScore: number,
  roleDistance: ReturnType<typeof getRoleDistance>
): { score: number; penaltiesApplied: string[] } {
  const penaltiesApplied: string[] = [];
  let score = baseScore;
  if (roleDistance.distance === 'LOW') {
    score -= 18;
    penaltiesApplied.push('different-role-family');
  } else if (roleDistance.distance === 'MEDIUM') {
    score -= 8;
    penaltiesApplied.push('adjacent-role-specialization');
  }
  const specialized = SPECIALIZED_ROLE_CONFIG[job.canonicalRole || ''];
  if (specialized?.unrelatedRoles.includes(candidateRole)) {
    score -= 24;
    penaltiesApplied.push('explicit-unrelated-role');
  }
  return { score: Math.max(0, score), penaltiesApplied };
}

function applySpecializedRoleCaps(
  job: JobForScoring,
  c: NormalizedCandidateProfile,
  candidateRole: string,
  score: number
): { cappedScore: number; caps: string[] } {
  const cfg = SPECIALIZED_ROLE_CONFIG[job.canonicalRole || ''];
  if (!cfg) return { cappedScore: score, caps: [] };
  const txt = candidateText(c);
  const caps: string[] = [];
  let cappedScore = score;

  const hasAnyFromAllGroups = cfg.mustHaveAny.every((group) =>
    group.some((item) => txt.includes(skillCompareKey(item)))
  );
  if (!hasAnyFromAllGroups) {
    cappedScore = Math.min(cappedScore, 35);
    caps.push('missing-specialized-experience-or-tools-cap-35');
  }
  const hasPortfolioSignal =
    txt.includes('portfolio') || txt.includes('behance') || txt.includes('dribbble') || txt.includes('case study');
  if (!hasPortfolioSignal) {
    cappedScore = Math.min(cappedScore, 50);
    caps.push('missing-portfolio-proof-cap-50');
  }
  if (cfg.unrelatedRoles.includes(candidateRole)) {
    cappedScore = Math.min(cappedScore, 28);
    caps.push('unrelated-role-cap-28');
  }
  return { cappedScore, caps };
}

export function scoreCandidateAgainstJob(
  job: JobForScoring,
  candidate: NormalizedCandidateProfile,
  options?: { semanticScore?: number | null }
): SubScores & { overallScore: number; debug: ScoreDebugData } {
  const j = sanitizeJobForScoring(job);
  const roleAlignment = scoreDomainAlignment(j, candidate);
  const hardReq = scoreHardRequirements(j, candidate);
  const experienceEvidence = scoreEvidenceStrength(j, candidate);
  const portfolioProof = scorePortfolioProof(candidate);
  const education = majorAlignmentScore(j, candidate);
  const locationPrefAuth = locationAndPreferenceScore(j, candidate);
  const roleDistance = getRoleDistance(j.canonicalRole || 'generalist', roleAlignment.candidateRole);

  const weighted =
    roleAlignment.score * 0.3 +
    hardReq.score * 0.25 +
    experienceEvidence * 0.2 +
    portfolioProof * 0.1 +
    education * 0.05 +
    locationPrefAuth * 0.1;

  const penalized = applyDomainPenalties(j, roleAlignment.candidateRole, Math.round(weighted), roleDistance);
  const capped = applySpecializedRoleCaps(j, candidate, roleAlignment.candidateRole, penalized.score);
  const semantic = options?.semanticScore == null ? null : Math.max(0, Math.min(100, Math.round(options.semanticScore)));
  const semanticBlendWeight = semantic == null ? 0 : 0.06;
  const withSemantic =
    semantic == null ? capped.cappedScore : Math.round(capped.cappedScore * (1 - semanticBlendWeight) + semantic * semanticBlendWeight);

  return {
    semanticScore: semantic,
    skillsScore: hardReq.score,
    titleScore: roleAlignment.score,
    locationScore: locationPrefAuth,
    gpaScore: education,
    industryScore: roleAlignment.score,
    preferenceScore: locationPrefAuth,
    overallScore: Math.max(0, Math.min(100, withSemantic)),
    debug: {
      matchedRequiredSkills: hardReq.matched.slice(0, 8),
      missingRequiredSkills: hardReq.missing.slice(0, 8),
      matchedTitleSignals: roleAlignment.distance === 'HIGH' ? [j.canonicalRole || ''] : [roleAlignment.reason],
      titleSignalCount: 1,
      titleSignalHits: roleAlignment.distance === 'LOW' ? 0 : 1,
      skillsReason: hardReq.reason,
      titleReason: roleAlignment.reason,
      relevanceGateMultiplier: 1,
      semanticBlendWeight,
      usedSemantic: semantic != null,
      functionAlignmentScore: roleAlignment.score,
      experienceEvidenceScore: experienceEvidence,
      authorizationScore: locationPrefAuth,
      majorAlignmentScore: education,
      educationFitScore: education,
      readinessScore: portfolioProof,
      primaryComposite: Math.round(roleAlignment.score * 0.55 + hardReq.score * 0.45),
      secondaryComposite: Math.round(locationPrefAuth * 0.5 + education * 0.5),
      canonicalRole: j.canonicalRole || 'generalist',
      roleFamily: j.roleFamily || 'general',
      roleSpecialization: j.roleSpecialization || 'general',
      roleDistance: roleDistance.distance,
      roleDistanceScore: roleDistance.score,
      penaltiesApplied: penalized.penaltiesApplied,
      scoreCapsApplied: capped.caps,
      hardRequirements: (j.hardRequirements || []).slice(0, 8),
      requiredTools: (j.requiredTools || []).slice(0, 8),
      domainKeywords: (j.domainKeywords || []).slice(0, 8),
      formulaInputs: {
        roleDomainAlignment: roleAlignment.score,
        hardSkillsTools: hardReq.score,
        experienceEvidence,
        portfolioProof,
        educationRelevance: education,
        locationPreferencesAuth: locationPrefAuth,
        weightedBase: Math.round(weighted),
        afterPenalties: penalized.score,
        afterCaps: capped.cappedScore,
        semanticBlendWeight,
        semanticScore: semantic,
      },
    },
  };
}

export function buildScoreDebugLines(
  job: JobForScoring,
  candidate: NormalizedCandidateProfile,
  scores: SubScores & { overallScore: number; debug?: ScoreDebugData }
): string[] {
  const d = scores.debug;
  return [
    `[match-debug] candidate=${candidate.candidateId} overall=${scores.overallScore}`,
    `  canonical_role=${d?.canonicalRole || 'generalist'} role_family=${d?.roleFamily || 'general'} role_specialization=${d?.roleSpecialization || 'general'}`,
    `  hard_requirements=[${(d?.hardRequirements || []).join(', ')}]`,
    `  required_tools=[${(d?.requiredTools || []).join(', ')}]`,
    `  domain_keywords=[${(d?.domainKeywords || []).join(', ')}]`,
    `  role_distance=${d?.roleDistance || 'LOW'} role_distance_score=${d?.roleDistanceScore ?? 0}`,
    `  penalties=[${(d?.penaltiesApplied || []).join(', ')}]`,
    `  score_caps=[${(d?.scoreCapsApplied || []).join(', ')}]`,
    `  weighted_breakdown=role(${scores.titleScore}) skills(${scores.skillsScore}) experience(${d?.experienceEvidenceScore ?? 0}) portfolio(${d?.readinessScore ?? 0}) education(${scores.gpaScore}) location_pref_auth(${scores.preferenceScore})`,
    `  matchedRequired=[${(d?.matchedRequiredSkills || []).join(', ')}]`,
    `  missingRequired=[${(d?.missingRequiredSkills || []).join(', ')}]`,
  ];
}

export function parseMinGpa(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const s = String(raw).replace(/\+/g, '').trim();
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}
