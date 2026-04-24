import type { NormalizedCandidateProfile } from '@/types/matching';
import { dedupeSkillList, normalizeWhitespaceLower, skillCompareKey } from '@/lib/matching/normalize-terms';
import {
  SPECIALIZED_ROLE_CONFIG,
  detectRoleFromCandidateText,
  detectRoleFromIdentityText,
  getRoleDistance,
  resolveCanonicalRoleKey,
} from '@/lib/matching/role-taxonomy';
import { buildAnchorSkillList, isGenericAnchorToken, scoreAnchorCoverage } from '@/lib/matching/anchor-skills';
import { evaluateMatchEligibility, type MatchEligibilityResult } from '@/lib/matching/eligibility';

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
  /** Domain anchor phrases (explicit + defaults); optional on legacy jobs. */
  anchorSkills?: string[];
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
  /** Job body text for role resolution (kept in sync with Firestore `description`). */
  description?: string | null;
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
  /** Overlap on required skills, hard reqs, tools (general + domain). */
  skillsScore: number;
  /** Role specialization / taxonomy alignment (0–100). */
  titleScore: number;
  /** Geography / remote fit only. */
  locationScore: number;
  /** Numeric GPA vs job minimum when both known; else neutral. */
  gpaScore: number;
  /** Industry + domain keyword + career-interest overlap. */
  industryScore: number;
  /** Employment / job-type preference match only. */
  preferenceScore: number;
  /** Sponsorship / work authorization compatibility (0–100). */
  authorizationScore?: number;
  /** Anchor-skill coverage (0–100). */
  anchorSkillScore?: number;
  /** Major / education requirement text overlap (0–100). */
  majorFitScore?: number;
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
  candidateCanonicalRole?: string;
  roleDistance?: string;
  roleDistanceScore?: number;
  penaltiesApplied?: string[];
  scoreCapsApplied?: string[];
  hardRequirements?: string[];
  requiredTools?: string[];
  domainKeywords?: string[];
  anchorSkillsUsed?: string[];
  matchedAnchors?: string[];
  missingAnchors?: string[];
  eligibility?: MatchEligibilityResult;
  domainIndustryScore?: number;
  toolsOverlapScore?: number;
  specializationScore?: number;
  gpaNumericFitScore?: number;
  formulaInputs?: {
    specialization: number;
    anchorSkills: number;
    experienceEvidence: number;
    domainIndustry: number;
    toolsOverlap: number;
    majorAlignment: number;
    gpaNumericFit: number;
    location: number;
    jobTypePreference: number;
    authorization: number;
    readiness: number;
    weightedBase: number;
    afterPenalties: number;
    afterCaps: number;
    afterEligibilityFloor?: number;
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

function identityHay(c: NormalizedCandidateProfile): string {
  return norm(
    [c.headline, c.bio, ...c.targetRoles, c.desiredRolesText, c.roleDetectionText].join(' ')
  );
}

function experienceHay(c: NormalizedCandidateProfile): string {
  const resumeSnip = String((c.raw as Record<string, unknown>).resumeText || '')
    .slice(0, 1200)
    .toLowerCase();
  return norm(
    [
      c.experienceSummary,
      c.matchingText,
      ...c.structuredExperienceSignals,
      ...c.experienceKeywords,
      resumeSnip,
    ].join(' ')
  );
}

/** Prefer identity signals; fall back to experience for role classification. */
export function detectCandidateCanonicalRole(c: NormalizedCandidateProfile): string {
  const idText = c.roleDetectionText || [c.headline, ...c.targetRoles].filter(Boolean).join(' ');
  const fromId = detectRoleFromIdentityText(idText);
  if (fromId !== 'generalist') return fromId;
  const expProbe = [c.experienceSummary, ...c.structuredExperienceSignals, c.matchingText].join(' ').slice(0, 2000);
  return detectRoleFromCandidateText(expProbe);
}

function sanitizeJobForScoring(job: JobForScoring): JobForScoring {
  const desc = String(job.description || '').slice(0, 12000);
  const resolved = resolveCanonicalRoleKey(
    job.canonicalRole,
    `${job.normalizedTitle || job.title || ''} ${desc} ${(job.domainKeywords || []).join(' ')}`.trim()
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
    requiredSkills: dedupeSkillList(job.requiredSkills || []).map((s) => String(s)).filter((s) => !isGenericAnchorToken(skillCompareKey(s))),
    preferredSkills: dedupeSkillList(job.preferredSkills || []),
    keywords: dedupeSkillList((job.keywords || []).map((k) => String(k)))
      .filter((k) => k.length >= 2 && !isGenericAnchorToken(skillCompareKey(k)))
      .slice(0, 40),
    anchorSkills: buildAnchorSkillList(
      {
        canonicalRole: resolved.canonicalRole,
        domainKeywords: job.domainKeywords,
        anchorSkills: job.anchorSkills,
      },
      job.anchorSkills
    ),
  };
}

function scoreSpecializationAlignment(job: JobForScoring, candidateRole: string): {
  score: number;
  distance: string;
  reason: string;
} {
  const rd = getRoleDistance(job.canonicalRole || 'generalist', candidateRole);
  return { score: rd.score, distance: rd.distance, reason: rd.reason };
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

function scoreHardSkillsAndTools(job: JobForScoring, c: NormalizedCandidateProfile): {
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
  ]).filter((s) => !isGenericAnchorToken(skillCompareKey(s)));
  const core = overlapScore(requiredPool, txt);
  const preferred = overlapScore([...(job.preferredSkills || []), ...(job.softRequirements || [])], txt);
  const final = Math.round(core.score * 0.8 + preferred.score * 0.2);
  return {
    score: final,
    matched: core.matched.slice(0, 10),
    missing: core.missing.slice(0, 10),
    reason: core.matched.length ? 'hard-skills-overlap' : 'hard-skills-miss',
  };
}

function scoreToolsOverlap(job: JobForScoring, c: NormalizedCandidateProfile): number {
  const tools = dedupeSkillList(job.requiredTools || []).map(skillCompareKey).filter((t) => t.length >= 2);
  if (!tools.length) return 62;
  const txt = candidateText(c);
  const hit = tools.filter((t) => txt.includes(t)).length;
  return Math.round((hit / tools.length) * 100);
}

function scoreEvidenceStrength(job: JobForScoring, c: NormalizedCandidateProfile): number {
  const high = norm(
    [c.headline, c.experienceSummary, c.matchingText, ...c.structuredExperienceSignals, ...c.experienceKeywords].join(' ')
  );
  const medium = norm([c.educationSummary, ...c.normalizedSkills, ...c.educationKeywords].join(' '));
  const low = norm([c.desiredRolesText, ...c.careerInterests, ...c.preferenceSignals].join(' '));
  const signals = dedupeSkillList([
    ...(job.domainKeywords || []),
    ...(job.requiredSkills || []),
    ...(job.requiredTools || []),
    ...(job.hardRequirements || []),
    ...(job.anchorSkills || []),
  ])
    .map(skillCompareKey)
    .filter((s) => s.length >= 3 && !isGenericAnchorToken(s));
  if (!signals.length) return 52;
  let weightedHits = 0;
  const max = signals.length * 1.85;
  for (const s of signals) {
    if (high.includes(s)) weightedHits += 1;
    else if (medium.includes(s)) weightedHits += 0.55;
    else if (low.includes(s)) weightedHits += 0.2;
  }
  return Math.round((weightedHits / max) * 100);
}

function scorePortfolioReadiness(c: NormalizedCandidateProfile): number {
  const txt = candidateText(c);
  const hasPortfolioSignal =
    txt.includes('portfolio') ||
    txt.includes('behance') ||
    txt.includes('dribbble') ||
    txt.includes('case study');
  let score = hasPortfolioSignal ? 72 : 28;
  if (c.hasResume) score += 12;
  if (c.hasVideo) score += 8;
  if (c.recruiterConfidenceSignals?.endorsementsCount && c.recruiterConfidenceSignals.endorsementsCount > 0) {
    score += 4;
  }
  return Math.max(0, Math.min(100, score));
}

function majorAlignmentScore(job: JobForScoring, c: NormalizedCandidateProfile): number {
  const required = dedupeSkillList(job.requiredMajors || []).map(norm).filter((x) => x.length >= 2);
  const preferred = dedupeSkillList(job.preferredMajors || []).map(norm).filter((x) => x.length >= 2);
  const educationRequired = dedupeSkillList(job.educationRequirements || []).map(norm).filter((x) => x.length >= 2);
  if (!required.length && !preferred.length && !educationRequired.length) return 62;
  const blob = norm([c.educationSummary, ...c.educationKeywords].join(' '));
  const all = dedupeSkillList([...required, ...preferred, ...educationRequired]).filter((x) => x.length >= 2);
  const hits = all.filter((x) => blob.includes(x)).length;
  return Math.round((hits / Math.max(1, all.length)) * 100);
}

function scoreGpaNumericFit(job: JobForScoring, c: NormalizedCandidateProfile): number {
  if (job.minGpaNumeric == null) return 65;
  if (c.gpaNumeric == null || !Number.isFinite(c.gpaNumeric)) return 48;
  if (c.gpaNumeric >= job.minGpaNumeric) return 96;
  const ratio = c.gpaNumeric / job.minGpaNumeric;
  return Math.max(12, Math.min(88, Math.round(ratio * 85)));
}

function scoreIndustryDomainAlignment(job: JobForScoring, c: NormalizedCandidateProfile): number {
  const bits = dedupeSkillList(
    [
      job.industry || '',
      ...(job.requiredCareerInterests || []),
      ...(job.domainKeywords || []).slice(0, 12),
    ]
      .map((s) => String(s).trim())
      .filter(Boolean)
  ).map(norm).filter((b) => b.length >= 3 && !isGenericAnchorToken(b));
  if (!bits.length) return 60;
  const blob = norm(
    [...c.normalizedIndustries, ...c.careerInterests, c.matchingText, c.headline].join(' ')
  );
  const hits = bits.filter((b) => blob.includes(b)).length;
  return Math.round((hits / bits.length) * 100);
}

function splitLocationPreferenceAuthorization(job: JobForScoring, c: NormalizedCandidateProfile): {
  locationScore: number;
  preferenceScore: number;
  authorizationScore: number;
  sponsorshipHardBlock: boolean;
} {
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
  const preferenceScore = prefHit ? 86 : 36;
  const sponsorshipHardBlock = job.sponsorshipAccepted === false && c.workAuthNeedsSponsorship === true;
  const authorizationScore = sponsorshipHardBlock ? 8 : job.sponsorshipAccepted === false ? 55 : 88;
  return { locationScore, preferenceScore, authorizationScore, sponsorshipHardBlock };
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
    score -= 26;
    penaltiesApplied.push('different-role-family');
  } else if (roleDistance.distance === 'MEDIUM') {
    score -= 12;
    penaltiesApplied.push('same-family-different-specialization');
  } else if (roleDistance.distance === 'MEDIUM_HIGH') {
    score -= 5;
    penaltiesApplied.push('adjacent-specialization');
  }
  const specialized = SPECIALIZED_ROLE_CONFIG[job.canonicalRole || ''];
  if (specialized?.unrelatedRoles.includes(candidateRole)) {
    score -= 30;
    penaltiesApplied.push('explicit-unrelated-role');
  }
  return { score: Math.max(0, score), penaltiesApplied };
}

function applySpecializedRoleCaps(
  job: JobForScoring,
  c: NormalizedCandidateProfile,
  candidateRole: string,
  score: number,
  anchor: { coverageRatio: number; score: number }
): { cappedScore: number; caps: string[] } {
  const cfg = SPECIALIZED_ROLE_CONFIG[job.canonicalRole || ''];
  const caps: string[] = [];
  let cappedScore = score;
  const txt = candidateText(c);

  if (cfg) {
    const hasAnyFromAllGroups = cfg.mustHaveAny.every((group) =>
      group.some((item) => txt.includes(skillCompareKey(item)))
    );
    if (!hasAnyFromAllGroups) {
      cappedScore = Math.min(cappedScore, 32);
      caps.push('missing-specialized-must-have-cap-32');
    }
    if (anchor.coverageRatio < 0.2 && (job.anchorSkills || []).length >= 4) {
      cappedScore = Math.min(cappedScore, 28);
      caps.push('anchor-coverage-under-20pct-cap-28');
    }
    const hasPortfolioSignal =
      txt.includes('portfolio') || txt.includes('behance') || txt.includes('dribbble') || txt.includes('case study');
    const creativeFamilies = ['design'];
    if (creativeFamilies.includes(job.roleFamily || '') && !hasPortfolioSignal) {
      cappedScore = Math.min(cappedScore, 48);
      caps.push('creative-missing-portfolio-cap-48');
    }
    if (cfg.unrelatedRoles.includes(candidateRole)) {
      cappedScore = Math.min(cappedScore, 24);
      caps.push('unrelated-role-cap-24');
    }
  }

  return { cappedScore, caps };
}

function applyEligibilityFloor(
  overall: number,
  eligibility: MatchEligibilityResult,
  jobCanonical: string
): { score: number; note?: string } {
  const specialized = Boolean(SPECIALIZED_ROLE_CONFIG[jobCanonical]);
  if (eligibility.eligibilityStatus === 'weak_domain_fit' && specialized) {
    return { score: Math.min(overall, 34), note: 'eligibility-floor-weak-domain' };
  }
  if (eligibility.eligibilityStatus === 'borderline' && specialized) {
    return { score: Math.min(overall, 58), note: 'eligibility-cap-borderline-specialized' };
  }
  if (eligibility.eligibilityStatus === 'borderline') {
    return { score: Math.min(overall, 72), note: 'eligibility-cap-borderline' };
  }
  return { score: overall };
}

export function scoreCandidateAgainstJob(
  job: JobForScoring,
  candidate: NormalizedCandidateProfile,
  options?: { semanticScore?: number | null }
): SubScores & { overallScore: number; debug: ScoreDebugData } {
  const j = sanitizeJobForScoring(job);
  const candidateRole = detectCandidateCanonicalRole(candidate);
  const spec = scoreSpecializationAlignment(j, candidateRole);
  const roleDistance = getRoleDistance(j.canonicalRole || 'generalist', candidateRole);

  const anchors = buildAnchorSkillList(
    { canonicalRole: j.canonicalRole, domainKeywords: j.domainKeywords, anchorSkills: j.anchorSkills },
    j.anchorSkills
  );
  const anchorResult = scoreAnchorCoverage(anchors, identityHay(candidate), experienceHay(candidate));

  const hardSkills = scoreHardSkillsAndTools(j, candidate);
  const toolsScore = scoreToolsOverlap(j, candidate);
  const experienceEvidence = scoreEvidenceStrength(j, candidate);
  const domainIndustry = scoreIndustryDomainAlignment(j, candidate);
  const major = majorAlignmentScore(j, candidate);
  const gpaNumericFit = scoreGpaNumericFit(j, candidate);
  const readiness = scorePortfolioReadiness(candidate);
  const { locationScore, preferenceScore, authorizationScore, sponsorshipHardBlock } =
    splitLocationPreferenceAuthorization(j, candidate);

  const minGpaHardFail =
    j.minGpaNumeric != null &&
    candidate.gpaNumeric != null &&
    Number.isFinite(candidate.gpaNumeric) &&
    candidate.gpaNumeric + 1e-6 < j.minGpaNumeric;

  const eligibility = evaluateMatchEligibility({
    jobCanonicalRole: j.canonicalRole || 'generalist',
    roleDistance: roleDistance.distance,
    specializationAlignmentScore: spec.score,
    anchorCoverage: anchorResult,
    sponsorshipHardBlock,
    minGpaHardFail,
  });

  const weighted =
    spec.score * 0.23 +
    anchorResult.score * 0.2 +
    experienceEvidence * 0.2 +
    domainIndustry * 0.12 +
    hardSkills.score * 0.08 +
    toolsScore * 0.07 +
    major * 0.04 +
    gpaNumericFit * 0.03 +
    locationScore * 0.05 +
    preferenceScore * 0.02 +
    authorizationScore * 0.02 +
    readiness * 0.04;

  const penalized = applyDomainPenalties(j, candidateRole, Math.round(weighted), roleDistance);
  const capped = applySpecializedRoleCaps(j, candidate, candidateRole, penalized.score, anchorResult);
  const floored = applyEligibilityFloor(capped.cappedScore, eligibility, j.canonicalRole || 'generalist');

  const semanticRaw =
    options?.semanticScore == null ? null : Math.max(0, Math.min(100, Math.round(options.semanticScore)));

  let semanticBlendWeight = semanticRaw == null ? 0 : 0.06;
  if (semanticRaw != null) {
    if (eligibility.eligibilityStatus === 'weak_domain_fit') semanticBlendWeight = 0.015;
    else if (eligibility.eligibilityStatus === 'borderline') semanticBlendWeight = 0.035;
    if (roleDistance.distance === 'LOW' && SPECIALIZED_ROLE_CONFIG[j.canonicalRole || '']) {
      semanticBlendWeight *= 0.45;
    }
  }

  const withSemantic =
    semanticRaw == null
      ? floored.score
      : Math.round(floored.score * (1 - semanticBlendWeight) + semanticRaw * semanticBlendWeight);

  const overallScore = Math.max(0, Math.min(100, withSemantic));

  return {
    semanticScore: semanticRaw,
    skillsScore: hardSkills.score,
    titleScore: spec.score,
    locationScore,
    gpaScore: gpaNumericFit,
    industryScore: domainIndustry,
    preferenceScore,
    authorizationScore,
    anchorSkillScore: anchorResult.score,
    majorFitScore: major,
    overallScore,
    debug: {
      matchedRequiredSkills: hardSkills.matched.slice(0, 8),
      missingRequiredSkills: hardSkills.missing.slice(0, 8),
      matchedTitleSignals: spec.distance === 'HIGH' ? [j.canonicalRole || ''] : [spec.reason],
      titleSignalCount: 1,
      titleSignalHits: spec.distance === 'LOW' ? 0 : 1,
      skillsReason: hardSkills.reason,
      titleReason: spec.reason,
      relevanceGateMultiplier: 1,
      semanticBlendWeight,
      usedSemantic: semanticRaw != null,
      functionAlignmentScore: spec.score,
      experienceEvidenceScore: experienceEvidence,
      authorizationScore,
      majorAlignmentScore: major,
      educationFitScore: Math.round(major * 0.55 + gpaNumericFit * 0.45),
      readinessScore: readiness,
      primaryComposite: Math.round(spec.score * 0.45 + anchorResult.score * 0.35 + experienceEvidence * 0.2),
      secondaryComposite: Math.round(locationScore * 0.45 + preferenceScore * 0.25 + authorizationScore * 0.3),
      canonicalRole: j.canonicalRole || 'generalist',
      roleFamily: j.roleFamily || 'general',
      roleSpecialization: j.roleSpecialization || 'general',
      candidateCanonicalRole: candidateRole,
      roleDistance: roleDistance.distance,
      roleDistanceScore: roleDistance.score,
      penaltiesApplied: penalized.penaltiesApplied,
      scoreCapsApplied: [...capped.caps, ...(floored.note ? [floored.note] : [])],
      hardRequirements: (j.hardRequirements || []).slice(0, 8),
      requiredTools: (j.requiredTools || []).slice(0, 8),
      domainKeywords: (j.domainKeywords || []).slice(0, 8),
      anchorSkillsUsed: anchors.slice(0, 16),
      matchedAnchors: anchorResult.matchedAnchors,
      missingAnchors: anchorResult.missingAnchors,
      eligibility,
      domainIndustryScore: domainIndustry,
      toolsOverlapScore: toolsScore,
      specializationScore: spec.score,
      gpaNumericFitScore: gpaNumericFit,
      formulaInputs: {
        specialization: spec.score,
        anchorSkills: anchorResult.score,
        experienceEvidence,
        domainIndustry,
        toolsOverlap: toolsScore,
        majorAlignment: major,
        gpaNumericFit,
        location: locationScore,
        jobTypePreference: preferenceScore,
        authorization: authorizationScore,
        readiness,
        weightedBase: Math.round(weighted),
        afterPenalties: penalized.score,
        afterCaps: capped.cappedScore,
        afterEligibilityFloor: floored.score,
        semanticBlendWeight,
        semanticScore: semanticRaw,
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
  const e = d?.eligibility;
  return [
    `[match-debug] candidate=${candidate.candidateId} overall=${scores.overallScore}`,
    `  eligibility=${e?.eligibilityStatus || 'n/a'} role_family_fit=${e?.roleFamilyFit ?? '-'} anchor_fit=${e?.anchorSkillFit ?? '-'}`,
    `  job_role=${d?.canonicalRole} candidate_role=${d?.candidateCanonicalRole} distance=${d?.roleDistance}`,
    `  anchors_used=[${(d?.anchorSkillsUsed || []).join(', ')}]`,
    `  matched_anchors=[${(d?.matchedAnchors || []).join(', ')}]`,
    `  penalties=[${(d?.penaltiesApplied || []).join(', ')}] caps=[${(d?.scoreCapsApplied || []).join(', ')}]`,
    `  dims spec=${d?.specializationScore} anchor=${scores.anchorSkillScore} exp=${d?.experienceEvidenceScore} domain=${d?.domainIndustryScore} skills=${scores.skillsScore} tools=${d?.toolsOverlapScore} major=${scores.majorFitScore} gpa=${scores.gpaScore} loc=${scores.locationScore} pref=${scores.preferenceScore} auth=${scores.authorizationScore}`,
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
