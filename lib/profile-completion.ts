/**
 * Profile completion % (shared by client UI, server projections, matching eligibility, and cron).
 * Recruiter-value weighted 100-point model + caps for missing high-signal assets.
 */

function nonemptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function truthyFlag(v: unknown): boolean {
  return v === true || v === "true";
}

/** Resume counts if secure path, explicit flag, or legacy URL. */
export function hasResumeForCompletion(p: Record<string, unknown>): boolean {
  return (
    nonemptyString(p.resumeStoragePath) ||
    truthyFlag(p.hasResume) ||
    nonemptyString(p.resumeUrl)
  );
}

/** Intro video counts if secure path, explicit flags, or legacy URL. */
export function hasIntroVideoForCompletion(p: Record<string, unknown>): boolean {
  return (
    nonemptyString(p.introVideoStoragePath) ||
    truthyFlag(p.hasIntroVideo) ||
    truthyFlag(p.hasVideo) ||
    nonemptyString(p.videoUrl)
  );
}

/** Transcript counts if secure path, explicit flag, or legacy URL. */
export function hasTranscriptForCompletion(p: Record<string, unknown>): boolean {
  return (
    nonemptyString(p.transcriptStoragePath) ||
    truthyFlag(p.hasTranscript) ||
    nonemptyString(p.transcriptUrl)
  );
}

/** Profile image counts if secure path, public URL, or legacy photoURL. */
export function hasProfileImageForCompletion(p: Record<string, unknown>): boolean {
  return (
    nonemptyString(p.profileImageStoragePath) ||
    nonemptyString(p.profileImageUrl) ||
    nonemptyString((p as { photoURL?: string }).photoURL)
  );
}

function hasStructuredSkillEvidence(skillsV2: unknown): boolean {
  if (!Array.isArray(skillsV2)) return false;
  return (skillsV2 as Array<Record<string, unknown>>).some((s) => {
    const name = String(s?.name || "").trim();
    if (!name) return false;
    const prof = String(s?.proficiency || "").trim();
    const ev = Array.isArray(s?.evidenceSources) ? (s.evidenceSources as unknown[]).length : 0;
    return Boolean(prof) || ev > 0;
  });
}

function educationBlockComplete(p: Record<string, unknown>): boolean {
  const ed = p.education;
  if (!Array.isArray(ed) || ed.length === 0) return false;
  return (ed as Array<Record<string, unknown>>).every(
    (edu) =>
      nonemptyString(edu.school) &&
      nonemptyString(edu.degree) &&
      Array.isArray(edu.majors) &&
      (edu.majors as unknown[]).length > 0 &&
      nonemptyString(edu.graduationYear)
  );
}

function gpaPresent(p: Record<string, unknown>): boolean {
  if (nonemptyString(p.gpa)) return true;
  const ed = p.education;
  if (!Array.isArray(ed)) return false;
  return (ed as Array<Record<string, unknown>>).some((e) => nonemptyString(e.gpa));
}

/**
 * Raw score 0–100 from recruiter-value rubric (before caps).
 */
export function calculateCompletionRaw(profileData: Record<string, unknown> | null | undefined): number {
  if (!profileData) return 0;
  const p = profileData;

  let total = 0;

  // A. Identity + pitch — 12
  if (nonemptyString(p.firstName) && nonemptyString(p.lastName)) total += 2;
  if (nonemptyString(p.headline)) total += 4;
  const summary =
    String((p.professionalSummaryV2 as { summary?: string } | undefined)?.summary || "").trim() ||
    String(p.bio || "").trim();
  if (summary.length > 0) total += 6;

  // B. Role targeting — 12
  const targetRoles = Array.isArray(p.targetRolesV2) ? (p.targetRolesV2 as unknown[]) : [];
  if (targetRoles.length > 0) total += 8;
  const fnInterests = Array.isArray(p.interestFunctionsV2) ? (p.interestFunctionsV2 as unknown[]) : [];
  if (fnInterests.length > 0) total += 4;

  // C. Skills quality — 12
  const skills = Array.isArray(p.skills) ? (p.skills as unknown[]) : [];
  if (skills.length > 0) total += 8;
  if (hasStructuredSkillEvidence(p.skillsV2)) total += 4;

  // D. Experience evidence — 16
  if (nonemptyString(p.experience)) total += 6;
  const expV2 = Array.isArray(p.experienceProjectsV2) ? (p.experienceProjectsV2 as unknown[]) : [];
  if (expV2.length > 0) total += 8;
  const extracurriculars = Array.isArray(p.extracurriculars) ? (p.extracurriculars as unknown[]) : [];
  if (extracurriculars.length > 0) total += 2;

  // E. Education — 10
  if (educationBlockComplete(p)) total += 8;
  if (gpaPresent(p)) total += 2;

  // F. Work setup + authorization — 10
  const locations = Array.isArray(p.locations) ? (p.locations as unknown[]) : [];
  const workPreferences = Array.isArray(p.workPreferences) ? (p.workPreferences as unknown[]) : [];
  const jobTypes = Array.isArray(p.jobTypes) ? (p.jobTypes as unknown[]) : [];
  if (locations.length > 0 && workPreferences.length > 0 && jobTypes.length > 0) total += 5;
  const wa = p.workAuthorization as
    | { authorizedToWork?: boolean | null; requiresVisaSponsorship?: boolean | null }
    | undefined;
  if (
    wa &&
    (wa.authorizedToWork != null || wa.requiresVisaSponsorship != null)
  ) {
    total += 5;
  }

  // G. Professional links — 8
  if (nonemptyString(p.linkedinUrl)) total += 4;
  if (nonemptyString(p.portfolioUrl)) total += 4;

  // H. Recruiter confidence assets — 20
  if (hasResumeForCompletion(p)) total += 10;
  if (hasIntroVideoForCompletion(p)) total += 7;
  if (hasProfileImageForCompletion(p)) total += 3;

  // I. Academic proof — 4
  if (hasTranscriptForCompletion(p)) total += 4;

  // J. Trust extras — 6
  const endorsements = Number(
    (p as { endorsementCount?: unknown; endorsementsCount?: unknown }).endorsementCount ??
      (p as { endorsementsCount?: unknown }).endorsementsCount ??
      0
  );
  if (Number.isFinite(endorsements) && endorsements > 0) total += 3;
  const certs = Array.isArray(p.certifications) ? (p.certifications as unknown[]) : [];
  const langs = Array.isArray(p.languages) ? (p.languages as unknown[]) : [];
  if (certs.length > 0 || langs.length > 0) total += 3;

  return Math.max(0, Math.min(100, Math.floor(total)));
}

function applyCompletionCaps(
  raw: number,
  hasResume: boolean,
  hasVideo: boolean,
  hasProfileImage: boolean
): number {
  let capped = raw;
  if (!hasResume && !hasVideo && !hasProfileImage) {
    capped = Math.min(capped, 72);
  } else if (!hasResume && !hasVideo) {
    capped = Math.min(capped, 78);
  } else {
    if (!hasResume) capped = Math.min(capped, 85);
    if (!hasVideo) capped = Math.min(capped, 90);
    if (!hasProfileImage) capped = Math.min(capped, 95);
  }
  return Math.max(0, Math.min(100, Math.floor(capped)));
}

/**
 * Profile completion % after caps (use everywhere).
 */
export const calculateCompletion = (profileData: any): number => {
  const p = (profileData || {}) as Record<string, unknown>;
  const raw = calculateCompletionRaw(p);
  const hasResume = hasResumeForCompletion(p);
  const hasVideo = hasIntroVideoForCompletion(p);
  const hasProfileImage = hasProfileImageForCompletion(p);
  return applyCompletionCaps(raw, hasResume, hasVideo, hasProfileImage);
};
