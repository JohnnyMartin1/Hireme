/**
 * Profile completion % (shared by client UI and server-side matching).
 */
export const calculateCompletion = (profileData: any): number => {
  if (!profileData) return 0;

  const p = profileData;
  const checks = {
    headlineSummary: !!(
      p.firstName &&
      p.lastName &&
      p.headline &&
      (p.professionalSummaryV2?.summary || p.bio)
    ),
    targetRoles: !!(Array.isArray(p.targetRolesV2) ? p.targetRolesV2.length > 0 : false),
    skills: !!(
      (p.skills && p.skills.length > 0) ||
      (Array.isArray(p.skillsV2) && p.skillsV2.some((s: any) => s?.name))
    ),
    experienceProof: !!(
      p.experience ||
      (p.experienceProjectsV2 && p.experienceProjectsV2.length > 0) ||
      (p.extracurriculars && p.extracurriculars.length > 0)
    ),
    interests: !!(p.careerInterests && p.careerInterests.length > 0),
    workPreferences: !!(
      p.locations &&
      p.locations.length > 0 &&
      p.workPreferences &&
      p.workPreferences.length > 0 &&
      p.jobTypes &&
      p.jobTypes.length > 0
    ),
    education: !!(
      p.education &&
      p.education.length > 0 &&
      p.education.every(
        (edu: any) =>
          edu.school && edu.degree && edu.majors && edu.majors.length > 0 && edu.graduationYear
      )
    ),
    assetsLinks: !!(p.resumeUrl && (p.videoUrl || p.transcriptUrl || p.linkedinUrl || p.portfolioUrl)),
    authorization: !!(
      p.workAuthorization &&
      (p.workAuthorization.authorizedToWork != null ||
        p.workAuthorization.requiresVisaSponsorship != null)
    ),
    trustSignals: !!(
      (p.certifications && p.certifications.length > 0) ||
      (p.languages && p.languages.length > 0) ||
      (p.endorsementCount && p.endorsementCount > 0)
    ),
  };

  // Matching-first weighted score (high-value sections count more).
  const weights: Record<keyof typeof checks, number> = {
    headlineSummary: 16,
    targetRoles: 16,
    skills: 16,
    experienceProof: 16,
    interests: 7,
    workPreferences: 10,
    education: 8,
    assetsLinks: 8,
    authorization: 4,
    trustSignals: 3,
  };

  let total = 0;
  for (const [k, done] of Object.entries(checks)) {
    if (done) total += weights[k as keyof typeof checks];
  }
  return Math.max(0, Math.min(100, Math.floor(total)));
};
