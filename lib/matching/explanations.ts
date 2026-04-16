import type {
  NormalizedCandidateProfile,
  RecruiterFitLabel,
  RecruiterSummary,
} from '@/types/matching';
import type { JobForScoring, SubScores } from '@/lib/matching/scoring';
import { dedupeSkillList, skillCompareKey, isPresentableSkillLabel } from '@/lib/matching/normalize-terms';

function candidateSkillBlob(c: NormalizedCandidateProfile): string {
  return [c.headline, c.bio, c.experienceSummary, c.matchingText, ...c.mergedSkills].join(' ').toLowerCase();
}

function skillMatchedInProfile(needle: string, c: NormalizedCandidateProfile): boolean {
  const key = skillCompareKey(needle);
  if (key.length < 2) return false;
  const blob = candidateSkillBlob(c);
  const candSkills = c.mergedSkills.map((s) => skillCompareKey(s));
  if (key.length >= 3) {
    if (blob.includes(key)) return true;
    return candSkills.some((sk) => sk.includes(key) || key.includes(sk));
  }
  return candSkills.some((sk) => sk === key || sk.startsWith(key + ' '));
}

function presentableMatchedSkills(job: JobForScoring, c: NormalizedCandidateProfile): string[] {
  const pool = dedupeSkillList([
    ...job.requiredSkills,
    ...job.keywords.slice(0, 10).filter((k) => k.length >= 3),
  ]);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of pool) {
    if (!isPresentableSkillLabel(raw)) continue;
    if (!skillMatchedInProfile(raw, c)) continue;
    const display = raw.trim();
    const k = skillCompareKey(display);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(display);
    if (out.length >= 5) break;
  }
  return out;
}

function missingRequiredSkills(job: JobForScoring, matchedKeys: Set<string>): string[] {
  const req = dedupeSkillList(job.requiredSkills);
  const missing: string[] = [];
  for (const r of req) {
    if (!isPresentableSkillLabel(r)) continue;
    const k = skillCompareKey(r);
    if (k.length < 3) continue;
    if (!matchedKeys.has(k)) missing.push(r);
    if (missing.length >= 2) break;
  }
  return missing;
}

type DebugLike = {
  eligibility?: { eligibilityStatus?: string; gatingReasons?: string[] };
  specializationScore?: number;
  anchorSkillsUsed?: string[];
  matchedAnchors?: string[];
  missingAnchors?: string[];
  experienceEvidenceScore?: number;
  domainIndustryScore?: number;
  toolsOverlapScore?: number;
  majorAlignmentScore?: number;
  authorizationScore?: number;
  gpaNumericFitScore?: number;
  readinessScore?: number;
  roleDistance?: string;
  canonicalRole?: string;
  candidateCanonicalRole?: string;
  penaltiesApplied?: string[];
  scoreCapsApplied?: string[];
  formulaInputs?: Record<string, number | null | undefined> & {
    anchorSkills?: number;
  };
};

function anchorCoverageScore(scores: { debug?: DebugLike }): number | null {
  const formulaAnchor = scores.debug?.formulaInputs?.anchorSkills;
  if (typeof formulaAnchor === 'number' && Number.isFinite(formulaAnchor)) {
    return Math.max(0, Math.min(100, Math.round(formulaAnchor)));
  }

  const matched = scores.debug?.matchedAnchors?.length ?? 0;
  const missing = scores.debug?.missingAnchors?.length ?? 0;
  const total = matched + missing;
  if (total > 0) {
    return Math.round((matched / total) * 100);
  }

  return null;
}

function authorizationScore(scores: { debug?: DebugLike }): number | null {
  const raw = scores.debug?.authorizationScore;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, Math.round(raw)));
  }
  return null;
}

function majorAlignmentScore(scores: { debug?: DebugLike }): number | null {
  const raw = scores.debug?.majorAlignmentScore;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, Math.round(raw)));
  }
  return null;
}

function toSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function toPhrase(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.replace(/[.!?]$/, '');
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function humanizeRoleKey(value: string | null | undefined): string {
  if (!value) return '';
  return titleCaseWords(value.replace(/[_-]+/g, ' '));
}

function mapFitLabel(overallScore: number): RecruiterFitLabel {
  if (overallScore >= 75) return 'Strong fit';
  if (overallScore >= 55) return 'Good fit';
  if (overallScore >= 30) return 'Stretch fit';
  return 'Low fit';
}

function fitReasonForLabel(
  fitLabel: RecruiterFitLabel,
  scores: SubScores & { overallScore: number; debug?: DebugLike }
): string {
  const d = scores.debug;
  const anchorScore = anchorCoverageScore(scores);
  if (d?.roleDistance === 'LOW') {
    return 'Background appears to be in a different professional track from this role.';
  }
  if ((scores.titleScore < 40 || (anchorScore ?? 0) < 35) && fitLabel !== 'Strong fit') {
    return 'Some adjacent experience, but core role-specific signals are limited.';
  }

  switch (fitLabel) {
    case 'Strong fit':
      return 'Strong professional match across role alignment, skills, and domain signals.';
    case 'Good fit':
      return 'Relevant background with several strong overlaps for this role.';
    case 'Stretch fit':
      return 'Related experience is present, but key qualifications are still missing.';
    default:
      return 'Limited direct overlap with the required specialization.';
  }
}

function candidateIdentity(candidate: NormalizedCandidateProfile, debug?: DebugLike): string {
  const canonical = humanizeRoleKey(debug?.candidateCanonicalRole);
  if (canonical) return canonical;
  const firstRole = humanizeRoleKey(candidate.targetRoles[0] || candidate.normalizedRoles[0] || '');
  if (firstRole) return firstRole;
  const headline = toPhrase(String(candidate.headline || '').trim());
  if (headline) return headline;
  return 'Candidate';
}

function dedupeNonEmpty(values: string[], maxItems: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const cleaned = toSentence(raw);
    if (!cleaned) continue;
    const key = skillCompareKey(cleaned);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= maxItems) break;
  }
  return out;
}

function buildRecruiterSummary(
  job: JobForScoring,
  candidate: NormalizedCandidateProfile,
  scores: SubScores & { overallScore: number; debug?: DebugLike },
  matchedSkills: string[],
  missingSkills: string[]
): RecruiterSummary {
  const d = scores.debug;
  const anchorScore = anchorCoverageScore(scores);
  const authScore = authorizationScore(scores);
  const strengthCandidates: Array<{ priority: number; text: string }> = [];
  const gapCandidates: Array<{ priority: number; text: string }> = [];

  if (d?.roleDistance === 'LOW') {
    gapCandidates.push({
      priority: 100,
      text: 'Background appears to be in a different professional track than this role.',
    });
  } else if (d?.roleDistance === 'MEDIUM') {
    gapCandidates.push({
      priority: 88,
      text: 'Has related experience, but not directly in this exact role focus.',
    });
  } else if (d?.roleDistance === 'MEDIUM_HIGH') {
    strengthCandidates.push({
      priority: 92,
      text: 'Has adjacent specialization that can transfer to this position.',
    });
  }

  if (scores.titleScore >= 70) {
    strengthCandidates.push({
      priority: 98,
      text: `Professional background aligns well with ${job.normalizedTitle || job.title}.`,
    });
  } else if (scores.titleScore < 40) {
    gapCandidates.push({
      priority: 95,
      text: 'Limited evidence of direct alignment with this role specialization.',
    });
  }

  if ((anchorScore ?? 0) >= 65) {
    strengthCandidates.push({
      priority: 90,
      text: 'Profile shows several role-specific skills needed for this position.',
    });
  } else if ((anchorScore ?? 0) < 30 && (d?.anchorSkillsUsed || []).length >= 4) {
    gapCandidates.push({
      priority: 92,
      text: 'Lacks several role-specific skills required for this position.',
    });
  }

  if ((d?.experienceEvidenceScore ?? 0) >= 65) {
    strengthCandidates.push({
      priority: 85,
      text: 'Experience history includes work that is directly relevant to this role.',
    });
  } else if ((d?.experienceEvidenceScore ?? 0) < 35) {
    gapCandidates.push({
      priority: 90,
      text: 'Limited visible experience directly tied to this role.',
    });
  }

  if (scores.industryScore >= 68) {
    strengthCandidates.push({
      priority: 84,
      text: 'Domain background appears to align with this team and problem space.',
    });
  } else if (scores.industryScore < 42 && (job.industry || (job.domainKeywords || []).length)) {
    gapCandidates.push({
      priority: 84,
      text: 'No strong evidence of experience in this domain.',
    });
  }

  if (matchedSkills.length) {
    strengthCandidates.push({
      priority: 78,
      text: `Has overlap on key skills and tools such as ${matchedSkills.slice(0, 3).join(', ')}.`,
    });
  }

  if (missingSkills.length) {
    gapCandidates.push({
      priority: 79,
      text: `Missing clear evidence for key requirements such as ${missingSkills.slice(0, 2).join(', ')}.`,
    });
  }

  if ((d?.readinessScore ?? 0) >= 70 || candidate.hasResume || candidate.hasVideo) {
    const readinessSignals = [
      candidate.hasResume ? 'resume' : null,
      candidate.hasVideo ? 'video introduction' : null,
    ].filter(Boolean) as string[];
    if (readinessSignals.length) {
      strengthCandidates.push({
        priority: 72,
        text: `Application materials are available (${readinessSignals.join(' and ')}).`,
      });
    }
  } else if ((d?.readinessScore ?? 0) < 38) {
    gapCandidates.push({
      priority: 70,
      text: 'Limited portfolio or project evidence makes evaluation harder.',
    });
  }

  if ((authScore ?? 0) >= 80) {
    strengthCandidates.push({
      priority: 58,
      text: 'Work authorization appears to align with role requirements.',
    });
  } else if ((authScore ?? 0) <= 25) {
    gapCandidates.push({
      priority: 66,
      text: 'Work authorization constraints may limit near-term hiring options.',
    });
  }

  if (scores.locationScore >= 80) {
    strengthCandidates.push({
      priority: 55,
      text: 'Location setup aligns well with this role.',
    });
  } else if (scores.locationScore < 48) {
    gapCandidates.push({
      priority: 62,
      text: 'Location preferences may not align with this role setup.',
    });
  }

  const strengths = dedupeNonEmpty(
    strengthCandidates.sort((a, b) => b.priority - a.priority).map((s) => s.text),
    3
  );
  const gaps = dedupeNonEmpty(
    gapCandidates.sort((a, b) => b.priority - a.priority).map((g) => g.text),
    3
  );

  const fitLabel = mapFitLabel(scores.overallScore);
  const fitReason = fitReasonForLabel(fitLabel, scores);

  const strongestStrength = toPhrase(strengths[0] || 'some relevant transferable strengths');
  const biggestGap = toPhrase(gaps[0] || 'a few qualifications remain unclear');
  const identity = candidateIdentity(candidate, d);
  const headline = toSentence(`${identity} with ${strongestStrength.toLowerCase()} but ${biggestGap.toLowerCase()}`);

  let riskNote: string | undefined;
  if (fitLabel === 'Stretch fit') {
    riskNote = 'Would likely require ramp-up time to cover role-specific gaps.';
  } else if (fitLabel === 'Low fit') {
    riskNote = 'Not a strong profile match based on currently available signals.';
  }

  return {
    headline,
    fitLabel,
    fitReason,
    strengths,
    gaps,
    riskNote,
  };
}

/**
 * Narrative aligned with upgraded scoring dimensions (specialization, anchors, domain, GPA, etc.).
 */
export function buildMatchExplanation(
  job: JobForScoring,
  candidate: NormalizedCandidateProfile,
  scores: SubScores & {
    overallScore: number;
    debug?: DebugLike;
  }
): { explanation: string; strengths: string[]; gaps: string[]; recruiterSummary: RecruiterSummary } {
  const strengths: string[] = [];
  const gaps: string[] = [];
  const d = scores.debug;
  const anchorScore = anchorCoverageScore(scores);
  const authScore = authorizationScore(scores);
  const majorScore = majorAlignmentScore(scores);
  const matchedSkills = presentableMatchedSkills(job, candidate);
  const matchedKeys = new Set(matchedSkills.map((m) => skillCompareKey(m)));

  const elig = d?.eligibility?.eligibilityStatus;
  if (elig === 'weak_domain_fit') {
    gaps.push('Eligibility screen: weak domain fit for this specialized role.');
  } else if (elig === 'borderline') {
    gaps.push('Eligibility screen: borderline fit — review role and anchor skills carefully.');
  }
  if (d?.eligibility?.gatingReasons?.length) {
    for (const r of d.eligibility.gatingReasons.slice(0, 2)) {
      if (!gaps.includes(r)) gaps.push(r);
    }
  }

  const dimensionRanked = [
    { key: 'specialization', label: 'role specialization fit', score: scores.titleScore },
    { key: 'anchors', label: 'domain anchor skills', score: anchorScore ?? 0 },
    { key: 'skills', label: 'required skills & tools', score: scores.skillsScore },
    { key: 'experience', label: 'experience evidence', score: d?.experienceEvidenceScore ?? 0 },
    { key: 'domain', label: 'industry / domain overlap', score: scores.industryScore },
    { key: 'gpa', label: 'GPA vs minimum', score: scores.gpaScore },
    { key: 'major', label: 'major / education requirements', score: majorScore ?? 0 },
    { key: 'location', label: 'location', score: scores.locationScore },
    { key: 'jobType', label: 'job type preference', score: scores.preferenceScore },
    { key: 'auth', label: 'work authorization', score: authScore ?? 0 },
    { key: 'readiness', label: 'readiness (resume, portfolio, video)', score: d?.readinessScore ?? 0 },
  ].sort((a, b) => b.score - a.score);

  if ((d?.matchedAnchors || []).length) {
    strengths.push(`Domain anchors matched: ${(d!.matchedAnchors || []).slice(0, 5).join(', ')}.`);
  } else if ((d?.anchorSkillsUsed || []).length >= 4) {
    gaps.push(
      `Few or no domain anchor skills from the job (${(d?.anchorSkillsUsed || []).slice(0, 4).join(', ')}) appear in this profile.`
    );
  }

  if (matchedSkills.length) {
    strengths.push(`Shared skills or tools: ${matchedSkills.join(', ')}.`);
  }

  if (scores.titleScore >= 70) {
    strengths.push(
      `Role specialization fit (${scores.titleScore}/100) aligns with "${job.normalizedTitle || job.title}".`
    );
  } else if (scores.titleScore < 40) {
    gaps.push(`Role specialization fit is low (${scores.titleScore}/100) for this opening.`);
  }

  if (d?.roleDistance === 'LOW') {
    gaps.unshift(
      `Different professional domain than this ${d?.canonicalRole || 'role'} opening (candidate signals: ${d?.candidateCanonicalRole || 'unknown'}).`
    );
  } else if (d?.roleDistance === 'MEDIUM') {
    gaps.push('Same broad field but different specialization than the job target.');
  } else if (d?.roleDistance === 'MEDIUM_HIGH') {
    strengths.push('Adjacent specialization — plausible stretch match.');
  }

  if ((anchorScore ?? 0) >= 65) {
    strengths.push(`Strong domain anchor overlap (${anchorScore}/100).`);
  } else if ((anchorScore ?? 0) < 30 && (d?.anchorSkillsUsed || []).length >= 4) {
    gaps.push(`Domain anchor coverage is weak (${anchorScore ?? 0}/100) for this role.`);
  }

  if ((d?.experienceEvidenceScore ?? 0) >= 65) {
    strengths.push(
      `Relevant experience evidence (${d?.experienceEvidenceScore}/100) tied to role skills and domain.`
    );
  } else if ((d?.experienceEvidenceScore ?? 0) < 35) {
    gaps.push(`Limited role-specific experience evidence (${d?.experienceEvidenceScore ?? 0}/100).`);
  }

  if (scores.industryScore >= 68) {
    strengths.push(`Industry / domain overlap is solid (${scores.industryScore}/100).`);
  } else if (scores.industryScore < 42 && (job.industry || (job.domainKeywords || []).length)) {
    gaps.push(`Industry or domain keyword overlap is limited (${scores.industryScore}/100).`);
  }

  if (job.minGpaNumeric != null) {
    if (scores.gpaScore >= 85) {
      strengths.push(`GPA meets or exceeds the stated minimum (${scores.gpaScore}/100 fit).`);
    } else if (scores.gpaScore < 45) {
      gaps.push(`GPA is below or unclear versus the job minimum (${scores.gpaScore}/100).`);
    }
  } else if ((majorScore ?? 0) >= 70) {
    strengths.push(`Education / major signals align (${majorScore}/100).`);
  }

  if (scores.locationScore >= 80) {
    const loc =
      job.workMode === 'REMOTE' || String(job.workMode).toUpperCase() === 'REMOTE'
        ? 'remote-friendly setup'
        : [job.locationCity, job.locationState].filter(Boolean).join(', ') || job.location || 'job location';
    strengths.push(`Location (${scores.locationScore}/100) fits ${loc}.`);
  } else if (scores.locationScore < 48) {
    gaps.push(`Location fit is weak (${scores.locationScore}/100).`);
  }

  if (scores.preferenceScore >= 80) {
    strengths.push(`Job type preference (${scores.preferenceScore}/100) matches ${String(job.employment || job.jobType || '').replace(/_/g, ' ')}.`);
  } else if (scores.preferenceScore < 42) {
    gaps.push(`Job type may not match the candidate's selected job types (${scores.preferenceScore}/100).`);
  }

  if ((authScore ?? 0) <= 25) {
    gaps.push(`Work authorization / sponsorship fit is poor (${authScore}/100).`);
  } else if ((authScore ?? 0) >= 80) {
    strengths.push(`Work authorization compatibility looks strong (${authScore}/100).`);
  }

  if ((d?.readinessScore ?? 0) >= 70) {
    strengths.push(`Recruiter readiness (${d?.readinessScore}/100): portfolio/resume/video signals.`);
  } else if ((d?.readinessScore ?? 0) < 38) {
    gaps.push(`Limited portfolio / readiness signals (${d?.readinessScore ?? 0}/100).`);
  }

  if (candidate.hasResume) strengths.push('Resume uploaded.');
  if (candidate.hasVideo) strengths.push('Intro video uploaded.');

  for (const m of missingRequiredSkills(job, matchedKeys)) {
    gaps.push(`No clear profile signal for "${m}".`);
  }

  if (strengths.length < 2) {
    const fallbacks: Array<{ score: number; text: string }> = [
      { score: scores.titleScore, text: `Role specialization fit ${scores.titleScore}/100.` },
      { score: scores.skillsScore, text: `Required skills/tools overlap ${scores.skillsScore}/100.` },
      { score: scores.industryScore, text: `Domain / industry overlap ${scores.industryScore}/100.` },
      { score: anchorScore ?? 0, text: `Anchor skill coverage ${anchorScore ?? 0}/100.` },
    ];
    for (const fb of fallbacks.sort((a, b) => b.score - a.score)) {
      if (strengths.length >= 2) break;
      strengths.push(fb.text);
    }
  }

  if (scores.titleScore < 38 && (anchorScore ?? 0) < 35) {
    gaps.unshift(
      `Core fit is weak on specialization (${scores.titleScore}/100) and anchors (${anchorScore ?? 0}/100); rank is not driven by location alone.`
    );
  }

  const topDimensions = dimensionRanked.slice(0, 3);
  const topDimensionText = topDimensions.map((x) => `${x.label} ${x.score}/100`).join(', ');
  let explanation = `Overall ${scores.overallScore}/100. Top drivers: ${topDimensionText}.`;

  if (d?.penaltiesApplied?.length) {
    explanation += ` Penalties: ${d.penaltiesApplied.join(', ')}.`;
  }
  if (d?.scoreCapsApplied?.length) {
    explanation += ` Caps: ${d.scoreCapsApplied.join(', ')}.`;
  }

  if (gaps.length > 0) {
    explanation += ` Key gaps: ${gaps.slice(0, 2).join(' ')}`;
  }

  const recruiterSummary = buildRecruiterSummary(
    job,
    candidate,
    scores,
    matchedSkills,
    missingRequiredSkills(job, matchedKeys)
  );

  return {
    explanation: explanation.replace(/\s+/g, ' ').trim(),
    strengths: dedupeSkillList(strengths).slice(0, 4).map((item) => toSentence(item)),
    gaps: dedupeSkillList(gaps).slice(0, 4).map((item) => toSentence(item)),
    recruiterSummary,
  };
}
