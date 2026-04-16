/**
 * Types for the job–candidate matching engine (Firestore-backed).
 * Job documents live in `jobs`; match rows in `jobMatches`.
 */

export type JobStatus = 'ACTIVE' | 'DRAFT' | 'CLOSED' | 'INACTIVE';

export type JobMatchStatus = 'pending' | 'complete' | 'failed';
export type RecruiterFitLabel = 'Strong fit' | 'Good fit' | 'Stretch fit' | 'Low fit';

/** Canonical recruiter-facing summary shared by employer match surfaces. */
export interface RecruiterSummary {
  headline: string;
  fitLabel: RecruiterFitLabel;
  fitReason: string;
  strengths: string[];
  gaps: string[];
  riskNote?: string;
}

/** Extended fields stored on Firestore `jobs` documents (beyond legacy fields). */
export interface JobMatchingFields {
  industry?: string | null;
  /** Denormalized single-line location for display / matching */
  location?: string | null;
  /** Mirrors employment for API clarity */
  jobType?: string | null;
  /** Minimum GPA as string e.g. "3.5" (alias of requiredGpa in places) */
  minGpa?: string | null;

  normalizedTitle?: string | null;
  aiSummary?: string | null;
  requiredSkills?: string[];
  preferredSkills?: string[];
  seniorityLevel?: string | null;
  keywords?: string[];
  mustHaves?: string[];
  niceToHaves?: string[];
  jobFunctions?: string[];
  industries?: string[];
  locationType?: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  minimumQualifications?: string[];
  roleAliases?: string[];
  /** Domain must-have phrases for specialized matching (AI + heuristic). */
  anchorSkills?: string[];
  experienceLevel?: string | null;
  requiredMajors?: string[];
  preferredMajors?: string[];
  sponsorshipAccepted?: boolean | null;
  relocationAccepted?: boolean | null;
  functionalArea?: string | null;
  /** Canonical normalized job object for matching/debug */
  jobNormalization?: ProcessedJobContent;
  /** Reserved for future embedding-based semantic score */
  embedding?: number[] | null;

  matchStatus?: JobMatchStatus;
  matchLastRunAt?: string | null;
  matchError?: string | null;
}

export interface JobMatchRecord {
  id: string;
  jobId: string;
  candidateId: string;
  employerId: string;
  overallScore: number;
  semanticScore: number | null;
  skillsScore: number;
  titleScore: number;
  locationScore: number;
  gpaScore: number;
  industryScore: number;
  preferenceScore: number;
  explanation: string;
  strengths: string[];
  gaps: string[];
  recruiterSummary?: RecruiterSummary;
  createdAt: string;
  updatedAt: string;
}

/** Normalized view of a candidate used only for scoring (does not mutate Firestore). */
export interface NormalizedCandidateProfile {
  candidateId: string;
  displayName: string;
  headline: string;
  bio: string;
  normalizedRoles: string[];
  normalizedSkills: string[];
  normalizedIndustries: string[];
  normalizedFunctions: string[];
  normalizedMajors: string[];
  normalizedDegrees: string[];
  normalizedSummary: string;
  targetRoles: string[];
  targetRoleSignals: string[];
  experienceKeywords: string[];
  educationKeywords: string[];
  structuredExperienceSignals: string[];
  skillEvidenceSignals: string[];
  preferenceSignals: string[];
  profileCompletenessSignals: string[];
  skills: string[];
  inferredSkills: string[];
  mergedSkills: string[];
  desiredRolesText: string;
  roleSignals: string[];
  matchingText: string;
  careerInterests: string[];
  location: string;
  jobTypes: string[];
  workPreferences: string[];
  gpaNumeric: number | null;
  workAuthAuthorized: boolean | null;
  workAuthNeedsSponsorship: boolean | null;
  educationSummary: string;
  experienceSummary: string;
  extracurricularsSummary: string;
  hasResume: boolean;
  hasVideo: boolean;
  hasTranscript: boolean;
  recruiterConfidenceSignals: {
    hasResume: boolean;
    hasVideo: boolean;
    hasTranscript: boolean;
    endorsementsCount: number;
    certificationsCount: number;
  };
  /** Short, identity-heavy text used for canonical role detection (reduces resume noise). */
  roleDetectionText: string;
  raw: Record<string, unknown>;
}

/** Structured output from job AI / heuristic processing */
export interface ProcessedJobContent {
  normalizedTitle: string;
  canonicalRole: string;
  roleFamily: string;
  roleSpecialization: string;
  hardRequirements: string[];
  softRequirements: string[];
  requiredTools: string[];
  domainKeywords: string[];
  experienceRequirements: string[];
  educationRequirements: string[];
  aiSummary: string | null;
  minGpa: string | null;
  locationType: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  requiredSkills: string[];
  preferredSkills: string[];
  seniorityLevel: string | null;
  keywords: string[];
  mustHaves: string[];
  niceToHaves: string[];
  jobFunctions: string[];
  functionalArea: string | null;
  industries: string[];
  experienceLevel: string | null;
  requiredMajors: string[];
  preferredMajors: string[];
  sponsorshipAccepted: boolean | null;
  relocationAccepted: boolean | null;
  minimumQualifications: string[];
  roleAliases: string[];
  anchorSkills?: string[];
  source: 'openai' | 'heuristic';
}
