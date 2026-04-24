import type { NormalizedCandidateProfile } from '@/types/matching';
import {
  dedupeSkillList,
  normalizeKeywordList,
  normalizeWhitespaceLower,
} from '@/lib/matching/normalize-terms';
import { expandTitleMatchSignals } from '@/lib/matching/title-roles';

function parseGpa(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x || '').trim()).filter(Boolean);
}

function asSkillsV2(v: unknown): Array<{ name: string; proficiency?: string; evidenceSources?: string[] }> {
  if (!Array.isArray(v)) return [];
  const out: Array<{ name: string; proficiency?: string; evidenceSources?: string[] }> = [];
  for (const row of v) {
    const obj = row as Record<string, unknown>;
    const name = String(obj?.name || '').trim();
    if (!name) continue;
    out.push({
      name,
      proficiency: String(obj?.proficiency || '').trim() || undefined,
      evidenceSources: asStringArray(obj?.evidenceSources || []),
    });
  }
  return out;
}

function extractCertNames(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((c) => (typeof c === 'string' ? c : String((c as { name?: string })?.name || '')))
    .map((x) => x.trim())
    .filter(Boolean);
}

function extractLanguages(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((l) => (typeof l === 'string' ? l : String((l as { language?: string })?.language || '')))
    .map((x) => x.trim())
    .filter(Boolean);
}

function extractEducationText(v: unknown): string {
  if (!Array.isArray(v)) return '';
  return (v as Array<Record<string, unknown>>)
    .map((e) =>
      [
        String(e.school || ''),
        String(e.degree || ''),
        Array.isArray(e.majors) ? (e.majors as string[]).join(' ') : '',
        Array.isArray(e.minors) ? (e.minors as string[]).join(' ') : '',
        String(e.graduationYear || ''),
      ]
        .filter(Boolean)
        .join(' ')
    )
    .filter(Boolean)
    .join(' ');
}

function extractEducationSignals(v: unknown): { majors: string[]; degrees: string[] } {
  if (!Array.isArray(v)) return { majors: [], degrees: [] };
  const majors: string[] = [];
  const degrees: string[] = [];
  for (const row of v as Array<Record<string, unknown>>) {
    if (Array.isArray(row.majors)) majors.push(...(row.majors as string[]).map((m) => String(m || '')));
    if (Array.isArray(row.minors)) majors.push(...(row.minors as string[]).map((m) => String(m || '')));
    const d = String(row.degree || '').trim();
    if (d) degrees.push(d);
  }
  return { majors: dedupeSkillList(majors), degrees: dedupeSkillList(degrees) };
}

const SKILL_INFER_HINTS = [
  'designer',
  'ux',
  'ui',
  'figma',
  'adobe',
  'photoshop',
  'illustrator',
  'indesign',
  'python',
  'java',
  'javascript',
  'typescript',
  'react',
  'node',
  'sql',
  'tableau',
  'excel',
  'finance',
  'modeling',
  'marketing',
  'seo',
  'sales',
  'product',
  'research',
  'analytics',
];

const INDUSTRY_HINTS = [
  'technology',
  'finance',
  'healthcare',
  'education',
  'retail',
  'marketing',
  'real estate',
  'legal',
  'manufacturing',
  'consulting',
  'media',
  'fashion',
];

/**
 * Canonical candidate normalization for matching.
 * Derives explainable normalized signals without mutating raw user data.
 */
export function normalizeCandidateForMatching(
  candidateId: string,
  doc: Record<string, unknown>
): NormalizedCandidateProfile {
  const first = String(doc.firstName || '');
  const last = String(doc.lastName || '');
  const displayName = `${first} ${last}`.trim() || String(doc.email || 'Candidate');

  const explicitSkills = asStringArray(doc.skills);
  const skillsV2 = asSkillsV2((doc as { skillsV2?: unknown }).skillsV2);
  const explicitSkillsV2 = skillsV2.map((s) => s.name);
  const careerInterests = asStringArray(doc.careerInterests);
  const targetRolesV2 = asStringArray((doc as { targetRolesV2?: unknown }).targetRolesV2).slice(0, 5);
  const industriesV2 = asStringArray((doc as { interestIndustriesV2?: unknown }).interestIndustriesV2);
  const functionsV2 = asStringArray((doc as { interestFunctionsV2?: unknown }).interestFunctionsV2);
  const jobTypes = asStringArray(doc.jobTypes);
  const workPreferences = asStringArray(doc.workPreferences);

  const headline = String(doc.headline || '');
  const bio = String(doc.bio || '');
  const professionalSummaryV2 = (doc as { professionalSummaryV2?: { summary?: string; targetRoleContext?: string; strengths?: string; standout?: string } }).professionalSummaryV2;
  const major = String(doc.major || '');
  const minor = String(doc.minor || '');
  const school = String(doc.school || '');
  const experience = String(doc.experience || '');
  const extracurriculars = asStringArray(doc.extracurriculars);
  const certifications = extractCertNames(doc.certifications);
  const languages = extractLanguages(doc.languages);
  const educationComposite = extractEducationText(doc.education);
  const educationSignals = extractEducationSignals(doc.education);
  const wa = doc.workAuthorization as
    | { authorizedToWork?: boolean; requiresVisaSponsorship?: boolean }
    | undefined;

  const resumeUrl = String(doc.resumeUrl || '').trim();
  const videoUrl = String(doc.videoUrl || '').trim();
  const transcriptUrl = String((doc as { transcriptUrl?: string }).transcriptUrl || '').trim();
  const endorsementsCount = Number((doc as { endorsementsCount?: number }).endorsementsCount || 0);
  const resumeText = String((doc as { resumeText?: string }).resumeText || '').trim();
  const structuredExperience = Array.isArray((doc as { experienceProjectsV2?: unknown }).experienceProjectsV2)
    ? ((doc as { experienceProjectsV2?: Array<Record<string, unknown>> }).experienceProjectsV2 || [])
    : [];

  const locFromArray = Array.isArray(doc.locations)
    ? (doc.locations as string[]).join(', ')
    : '';
  const locationStr = String(doc.location || locFromArray || '').toLowerCase();

  const roleIdentityLine = [
    headline,
    ...targetRolesV2,
    String(professionalSummaryV2?.targetRoleContext || ''),
  ]
    .filter(Boolean)
    .join(' · ');
  const desiredRolesText = [roleIdentityLine, major, minor, ...functionsV2, ...careerInterests]
    .filter(Boolean)
    .join(' · ');
  const normalizedRoles = dedupeSkillList(
    expandTitleMatchSignals(roleIdentityLine)
      .concat(expandTitleMatchSignals(desiredRolesText))
      .concat(normalizeKeywordList(normalizeWhitespaceLower(roleIdentityLine).split(/\s+/), 20))
  ).map((s) => s.toLowerCase());

  const structuredExperienceText = structuredExperience
    .map((e) =>
      [
        String(e.title || ''),
        String(e.organization || ''),
        String(e.type || ''),
        String(e.industry || ''),
        String(e.location || ''),
        Array.isArray(e.bullets) ? (e.bullets as string[]).join(' ') : '',
        Array.isArray(e.skillsUsed) ? (e.skillsUsed as string[]).join(' ') : '',
      ]
        .filter(Boolean)
        .join(' ')
    )
    .join(' ');

  const richText = [
    headline,
    bio,
    String(professionalSummaryV2?.summary || ''),
    String(professionalSummaryV2?.targetRoleContext || ''),
    String(professionalSummaryV2?.strengths || ''),
    String(professionalSummaryV2?.standout || ''),
    experience,
    structuredExperienceText,
    extracurriculars.join(', '),
    certifications.join(', '),
    languages.join(', '),
    educationComposite,
    school,
    major,
    minor,
    resumeText,
    ...targetRolesV2,
    ...industriesV2,
    ...functionsV2,
    ...careerInterests,
  ]
    .filter(Boolean)
    .join(' ');

  const richLower = normalizeWhitespaceLower(richText);
  const inferredSkills = SKILL_INFER_HINTS.filter((h) => {
    if (h.length < 5 && !['ux', 'ui', 'sql'].includes(h)) return false;
    return richLower.includes(h);
  });
  const structuredExpSkills = dedupeSkillList(
    structuredExperience.flatMap((e) =>
      Array.isArray(e.skillsUsed) ? (e.skillsUsed as string[]).map((s) => String(s || '')) : []
    )
  );
  const mergedSkills = dedupeSkillList([
    ...explicitSkills,
    ...explicitSkillsV2,
    ...structuredExpSkills,
    ...inferredSkills,
    ...functionsV2,
    ...careerInterests,
  ]);
  const normalizedSkills = mergedSkills.map((s) => s.toLowerCase());

  const normalizedIndustries = dedupeSkillList([
    ...industriesV2,
    ...careerInterests,
    ...INDUSTRY_HINTS.filter((h) => richLower.includes(h)),
  ]).map((s) => s.toLowerCase());
  const normalizedFunctions = dedupeSkillList([...functionsV2, ...inferredSkills.filter((s) => s.includes('analysis') || s.includes('design') || s.includes('research') || s.includes('marketing'))]).map((s) => s.toLowerCase());

  const experienceKeywords = normalizeKeywordList(
    normalizeWhitespaceLower([experience, structuredExperienceText, extracurriculars.join(' '), resumeText].join(' ')).split(/\s+/),
    40
  );

  const educationKeywords = normalizeKeywordList(
    normalizeWhitespaceLower([school, major, minor, educationComposite, certifications.join(' ')].join(' ')).split(/\s+/),
    30
  );

  const preferenceSignals = dedupeSkillList([
    ...jobTypes,
    ...workPreferences,
    locationStr,
    wa?.authorizedToWork === true ? 'authorized-to-work' : '',
    wa?.requiresVisaSponsorship === true ? 'requires-visa-sponsorship' : '',
    String((doc as { jobSearchPreferencesV2?: { activelyLooking?: boolean } }).jobSearchPreferencesV2?.activelyLooking === true ? 'actively-looking' : ''),
    String((doc as { jobSearchPreferencesV2?: { openToAdjacentRoles?: boolean } }).jobSearchPreferencesV2?.openToAdjacentRoles === true ? 'open-adjacent-roles' : ''),
    String((doc as { jobSearchPreferencesV2?: { willingToRelocate?: boolean } }).jobSearchPreferencesV2?.willingToRelocate === true ? 'willing-relocate' : ''),
  ])
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  const profileCompletenessSignals = [
    first && last ? 'has_name' : '',
    headline ? 'has_headline' : '',
    bio ? 'has_bio' : '',
    explicitSkills.length ? 'has_skills' : '',
    experience ? 'has_experience' : '',
    educationComposite || school || major ? 'has_education' : '',
    extracurriculars.length ? 'has_projects_or_clubs' : '',
    certifications.length ? 'has_certifications' : '',
    careerInterests.length ? 'has_industry_interests' : '',
    resumeUrl ? 'has_resume' : '',
    resumeText ? 'has_resume_text' : '',
    videoUrl ? 'has_video' : '',
    transcriptUrl ? 'has_transcript' : '',
    certifications.length ? 'has_certifications' : '',
    endorsementsCount > 0 ? 'has_endorsements' : '',
  ].filter(Boolean);

  const skillEvidenceSignals = dedupeSkillList(
    skillsV2.flatMap((s) =>
      [s.proficiency || '', ...(s.evidenceSources || [])].map((v) => String(v || '').trim().toLowerCase())
    )
  );
  const structuredExperienceSignals = dedupeSkillList(
    structuredExperience.flatMap((e) => {
      const bullets = Array.isArray(e.bullets) ? (e.bullets as string[]).map((b) => String(b || '').toLowerCase()) : [];
      return [
        String(e.title || ''),
        String(e.type || ''),
        String(e.organization || ''),
        String(e.industry || ''),
        ...(Array.isArray(e.skillsUsed) ? (e.skillsUsed as string[]) : []),
        ...bullets.map((b) => b.slice(0, 120)),
      ];
    })
  ).map((s) => s.toLowerCase());

  const normalizedSummary = normalizeWhitespaceLower(
    [desiredRolesText, richText, ...normalizedSkills, ...normalizedIndustries, ...normalizedFunctions].join(' ')
  );
  const roleDetectionText = normalizeWhitespaceLower(
    [headline, desiredRolesText, targetRolesV2.join(' '), richText, experience, structuredExperienceText].join(' ')
  );

  return {
    candidateId,
    displayName,
    headline,
    bio,
    normalizedRoles,
    normalizedSkills,
    normalizedIndustries,
    normalizedFunctions,
    normalizedMajors: dedupeSkillList([major, minor, ...educationSignals.majors].filter(Boolean)).map((s) => s.toLowerCase()),
    normalizedDegrees: dedupeSkillList(educationSignals.degrees).map((s) => s.toLowerCase()),
    normalizedSummary,
    targetRoles: dedupeSkillList(targetRolesV2.map((s) => s.toLowerCase())),
    targetRoleSignals: normalizedRoles,
    experienceKeywords,
    educationKeywords,
    structuredExperienceSignals,
    skillEvidenceSignals,
    preferenceSignals,
    profileCompletenessSignals,
    skills: dedupeSkillList([...explicitSkills, ...explicitSkillsV2]).map((s) => s.toLowerCase()),
    inferredSkills: inferredSkills.map((s) => s.toLowerCase()),
    mergedSkills: normalizedSkills,
    desiredRolesText: desiredRolesText.toLowerCase(),
    roleSignals: normalizedRoles,
    roleDetectionText,
    matchingText: normalizedSummary,
    careerInterests: careerInterests.map((s) => s.toLowerCase()),
    location: locationStr,
    jobTypes: jobTypes.map((s) => s.toUpperCase()),
    workPreferences: workPreferences.map((s) => s.toLowerCase()),
    gpaNumeric: parseGpa(doc.gpa),
    workAuthAuthorized: wa?.authorizedToWork ?? null,
    workAuthNeedsSponsorship: wa?.requiresVisaSponsorship ?? null,
    educationSummary: [school, major, minor, educationComposite].filter(Boolean).join(' ').toLowerCase(),
    experienceSummary: [experience, resumeText].filter(Boolean).join(' ').toLowerCase(),
    extracurricularsSummary: [extracurriculars.join(' '), certifications.join(' '), languages.join(' ')].join(' ').toLowerCase(),
    hasResume: resumeUrl.length > 0,
    hasVideo: videoUrl.length > 0,
    hasTranscript: transcriptUrl.length > 0,
    recruiterConfidenceSignals: {
      hasResume: resumeUrl.length > 0,
      hasVideo: videoUrl.length > 0,
      hasTranscript: transcriptUrl.length > 0,
      endorsementsCount: Number.isFinite(endorsementsCount) ? endorsementsCount : 0,
      certificationsCount: certifications.length,
    },
    raw: doc,
  };
}

