# Shared Matching Model

This document defines the shared model used by:
- candidate edit profile (`app/account/profile/page.tsx`)
- employer job posting form (`app/employer/job/new/page.tsx`)
- recruiter-facing candidate view (`app/candidate/[id]/page.tsx`)

## Normalized Candidate Object

Canonical interface: `NormalizedCandidateProfile` in `types/matching.ts`.

Key fields:
- `targetRoles`, `normalizedRoles`, `targetRoleSignals`
- `normalizedFunctions`
- `normalizedSkills`, `skillEvidenceSignals`
- `structuredExperienceSignals`, `experienceKeywords`
- `normalizedIndustries`
- `preferenceSignals`, `location`, `jobTypes`, `workPreferences`
- `normalizedMajors`, `normalizedDegrees`, `gpaNumeric`, `educationKeywords`
- `workAuthAuthorized`, `workAuthNeedsSponsorship`
- `hasResume`, `hasVideo`, `hasTranscript`, `recruiterConfidenceSignals`

Builder:
- `lib/matching/normalize-candidate.ts`

## Normalized Job Object

Canonical interface: `ProcessedJobContent` in `types/matching.ts`.

Key fields:
- `normalizedTitle`, `roleAliases`, `seniorityLevel`, `experienceLevel`
- `requiredSkills`, `preferredSkills`, `keywords`
- `mustHaves`, `niceToHaves`, `minimumQualifications`
- `jobFunctions`, `functionalArea`
- `industries`
- `requiredMajors`, `preferredMajors`
- `locationType`
- `sponsorshipAccepted`, `relocationAccepted`

Builder:
- `lib/ai/parse-job.ts`

## Raw vs Derived

Raw candidate-entered fields:
- `targetRolesV2`, `interestFunctionsV2`, `interestIndustriesV2`
- `skills`, `skillsV2`
- `experience`, `experienceProjectsV2`
- `education`, `careerInterests`, `jobTypes`, `workPreferences`, `locations`
- `workAuthorization`, `resumeUrl`, `videoUrl`, `transcriptUrl`, `certifications`

AI-derived / normalized candidate fields:
- `matchingNormalization` on the user doc (saved on profile update)
- derived object from `normalizeCandidateForMatching()`

Raw job-entered fields:
- `title`, `description`, `tags`
- `industry`, `experienceLevel`, `functionalArea`
- `requiredSkillsStructured`, `preferredSkillsStructured`
- `requiredMajors`, `preferredMajors`
- `requiredGpa`/`minGpa`
- `sponsorshipAccepted`, `relocationAccepted`
- `location*`, `workMode`, `employment`

AI-derived / normalized job fields:
- `jobNormalization`
- `normalizedTitle`, `requiredSkills`, `preferredSkills`, `keywords`
- `mustHaves`, `niceToHaves`, `jobFunctions`, `roleAliases`, `aiProcessingSource`

