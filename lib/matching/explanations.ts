import type { NormalizedCandidateProfile } from '@/types/matching';
import type { JobForScoring, SubScores } from '@/lib/matching/scoring';
import { dedupeSkillList, skillCompareKey, isPresentableSkillLabel } from '@/lib/matching/normalize-terms';

/** Same safe blob as scoring skills (no 1-char substring matches). */
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

/**
 * Matched skill/keyword labels safe to show recruiters (no garbage tokens).
 */
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

/**
 * Narrative + strengths + gaps from real score components (no vague default when data exists).
 */
export function buildMatchExplanation(
  job: JobForScoring,
  candidate: NormalizedCandidateProfile,
  scores: SubScores & {
    overallScore: number;
    debug?: {
      functionAlignmentScore?: number;
      experienceEvidenceScore?: number;
      authorizationScore?: number;
      majorAlignmentScore?: number;
      readinessScore?: number;
      roleDistance?: string;
      canonicalRole?: string;
      penaltiesApplied?: string[];
      scoreCapsApplied?: string[];
    };
  }
): { explanation: string; strengths: string[]; gaps: string[] } {
  const strengths: string[] = [];
  const gaps: string[] = [];
  const matchedSkills = presentableMatchedSkills(job, candidate);
  const matchedKeys = new Set(matchedSkills.map((m) => skillCompareKey(m)));
  const dimensionRanked = [
    { key: 'title', label: 'target role fit', score: scores.titleScore },
    { key: 'skills', label: 'strongest skills match', score: scores.skillsScore },
    { key: 'experience', label: 'relevant experience evidence', score: scores.debug?.experienceEvidenceScore ?? 0 },
    { key: 'function', label: 'function alignment', score: scores.debug?.functionAlignmentScore ?? 0 },
    { key: 'authorization', label: 'sponsorship/authorization fit', score: scores.debug?.authorizationScore ?? 0 },
    { key: 'education', label: 'education/GPA fit', score: scores.gpaScore },
    { key: 'location', label: 'location fit', score: scores.locationScore },
    { key: 'preference', label: 'job-type fit', score: scores.preferenceScore },
    { key: 'industry', label: 'industry alignment', score: scores.industryScore },
    { key: 'readiness', label: 'recruiter readiness signals', score: scores.debug?.readinessScore ?? 0 },
  ].sort((a, b) => b.score - a.score);

  if (matchedSkills.length) {
    strengths.push(`Shared skills or tools: ${matchedSkills.join(', ')}.`);
  }

  if (scores.titleScore >= 55) {
    strengths.push(
      `Target role fit (${scores.titleScore}/100): stated target roles and profile context align with "${job.normalizedTitle || job.title}".`
    );
  } else if (scores.titleScore >= 28 && scores.titleScore < 55) {
    gaps.push(
      `Limited title overlap (${scores.titleScore}/100) between this role and the candidate's stated focus.`
    );
  }
  if (scores.debug?.roleDistance === 'LOW') {
    gaps.unshift(
      `Background appears in a different role family than this ${scores.debug?.canonicalRole || 'target'} role.`
    );
  } else if (scores.debug?.roleDistance === 'MEDIUM') {
    gaps.push('Candidate appears adjacent to the target specialization, but not a direct specialization match.');
  }

  if ((scores.debug?.experienceEvidenceScore ?? 0) >= 65) {
    strengths.push(
      `Relevant experience evidence (${scores.debug?.experienceEvidenceScore}/100) appears in projects/internship signals tied to required skills.`
    );
  } else if ((scores.debug?.experienceEvidenceScore ?? 0) < 35) {
    gaps.push(
      `Limited role-specific experience evidence (${scores.debug?.experienceEvidenceScore ?? 0}/100) in the profile.`
    );
  }

  if ((scores.debug?.functionAlignmentScore ?? 0) >= 70) {
    strengths.push(`Function alignment is strong (${scores.debug?.functionAlignmentScore}/100).`);
  } else if ((scores.debug?.functionAlignmentScore ?? 0) < 35) {
    gaps.push(`Function alignment is weak (${scores.debug?.functionAlignmentScore ?? 0}/100).`);
  }

  if (scores.locationScore >= 80) {
    const loc =
      job.workMode === 'REMOTE' || String(job.workMode).toUpperCase() === 'REMOTE'
        ? 'remote-friendly setup'
        : [job.locationCity, job.locationState].filter(Boolean).join(', ') || job.location || 'job location';
    strengths.push(`Location fit (${scores.locationScore}/100) for ${loc}.`);
  } else if (scores.locationScore < 50 && scores.locationScore > 0) {
    gaps.push(`Location fit is weak (${scores.locationScore}/100) relative to the job's work mode and geography.`);
  }

  if (job.minGpaNumeric != null) {
    if (scores.gpaScore >= 80) {
      strengths.push(`Education/GPA fit is strong (${scores.gpaScore}/100) for the role requirements.`);
    } else if (scores.gpaScore >= 45 && scores.gpaScore < 80) {
      gaps.push(`Education/GPA fit is moderate (${scores.gpaScore}/100); stronger major/GPA evidence would improve rank.`);
    } else if (scores.gpaScore < 45) {
      gaps.push(`Education/GPA fit is weak (${scores.gpaScore}/100) versus stated requirements.`);
    }
  }

  if ((job.industry || (job.requiredCareerInterests || []).length) && scores.industryScore >= 70) {
    const bits = [job.industry, ...(job.requiredCareerInterests || []).slice(0, 2)].filter(Boolean);
    strengths.push(
      `Industry / interest alignment (${scores.industryScore}/100) with ${bits.join(', ')}.`
    );
  } else if ((job.industry || (job.requiredCareerInterests || []).length) && scores.industryScore < 50) {
    gaps.push(`Industry or required career-interest overlap is limited (${scores.industryScore}/100).`);
  }

  if (scores.preferenceScore >= 75) {
    strengths.push(
      `Work arrangement preference (${scores.preferenceScore}/100) matches the job type (${String(job.employment || job.jobType || '').replace(/_/g, ' ')}).`
    );
  } else if (scores.preferenceScore < 45) {
    gaps.push(
      `Job type (${String(job.employment || job.jobType || '').replace(/_/g, ' ')}) may not match the candidate's selected job types.`
    );
  }

  if ((scores.debug?.authorizationScore ?? 0) >= 85) {
    strengths.push(`Sponsorship/authorization fit is strong (${scores.debug?.authorizationScore}/100).`);
  } else if ((scores.debug?.authorizationScore ?? 0) <= 40) {
    gaps.push(`Sponsorship/authorization compatibility is weak (${scores.debug?.authorizationScore}/100).`);
  }

  if ((scores.debug?.readinessScore ?? 0) >= 70) {
    strengths.push(`Recruiter readiness signals are strong (${scores.debug?.readinessScore}/100).`);
  } else if ((scores.debug?.readinessScore ?? 0) < 40) {
    gaps.push(`Recruiter readiness signals are limited (${scores.debug?.readinessScore ?? 0}/100).`);
  }

  if (candidate.hasResume) strengths.push('Resume uploaded.');
  if (candidate.hasVideo) strengths.push('Intro video uploaded.');

  for (const m of missingRequiredSkills(job, matchedKeys)) {
    gaps.push(`No clear profile signal for "${m}".`);
  }

  // Ensure recruiter-facing strengths list has at least 2 concrete items.
  if (strengths.length < 2) {
    const fallbacks: Array<{ score: number; text: string }> = [
      { score: scores.skillsScore, text: `Skills overlap scored ${scores.skillsScore}/100.` },
      { score: scores.titleScore, text: `Role/title alignment scored ${scores.titleScore}/100.` },
      { score: scores.locationScore, text: `Location fit scored ${scores.locationScore}/100.` },
      { score: scores.preferenceScore, text: `Job-type fit scored ${scores.preferenceScore}/100.` },
      { score: scores.industryScore, text: `Industry alignment scored ${scores.industryScore}/100.` },
    ];
    for (const fb of fallbacks.sort((a, b) => b.score - a.score)) {
      if (strengths.length >= 2) break;
      strengths.push(fb.text);
    }
  }

  // Be explicit when role relevance is weak.
  if (scores.titleScore < 35 && scores.skillsScore < 35) {
    gaps.unshift(
      `Role relevance is weak (title ${scores.titleScore}/100, skills ${scores.skillsScore}/100), so this ranking is driven more by non-role dimensions.`
    );
  }

  const topDimensions = dimensionRanked.slice(0, 3);
  const topDimensionText = topDimensions.map((d) => `${d.label} ${d.score}/100`).join(', ');

  let explanation = `Overall ${scores.overallScore}/100. Top drivers: ${topDimensionText}.`;

  if (scores.titleScore >= 65) {
    explanation += ` Title alignment is strong.`;
  } else if (scores.titleScore < 35) {
    explanation += ` Title alignment is weak.`;
  }

  if (scores.skillsScore >= 65) {
    explanation += ` Skill overlap is strong${matchedSkills.length ? ` (${matchedSkills.slice(0, 3).join(', ')})` : ''}.`;
  } else if (scores.skillsScore < 35) {
    explanation += ` Skill overlap is weak.`;
  }

  if (scores.locationScore >= 75 || scores.preferenceScore >= 75) {
    explanation += ` Location/job-type compatibility contributes meaningfully.`;
  }

  if (gaps.length > 0) {
    explanation += ` Main gaps: ${gaps.slice(0, 2).join(' ')}`;
  }
  if (scores.debug?.penaltiesApplied?.length) {
    explanation += ` Domain penalties applied: ${scores.debug.penaltiesApplied.join(', ')}.`;
  }
  if (scores.debug?.scoreCapsApplied?.length) {
    explanation += ` Score caps applied: ${scores.debug.scoreCapsApplied.join(', ')}.`;
  }

  return {
    explanation: explanation.replace(/\s+/g, ' ').trim(),
    strengths: dedupeSkillList(strengths).slice(0, 4),
    gaps: dedupeSkillList(gaps).slice(0, 3),
  };
}
