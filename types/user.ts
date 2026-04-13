// types/user.ts
// Central UserProfile type used across the app.
// Add fields here as your app grows.

export interface UserProfile {
  // Common identity fields
  id?: string | null;
  name?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: "EMPLOYER" | "JOB_SEEKER" | "RECRUITER" | "ADMIN" | string | null;
  
  // Company relationship (for recruiters and employers)
  companyId?: string | null; // Links user to a company
  isCompanyOwner?: boolean | null; // True for company profile creators

  // Company profile fields used on /account/company
  companyName?: string | null;
  companyBio?: string | null;
  companyLocation?: string | null;
  companyWebsite?: string | null;
  companySize?: string | null;
  companyIndustry?: string | null;
  companyFounded?: string | null;
  bannerImageUrl?: string | null;
  logoImageUrl?: string | null;

  // Job seeker profile fields
  headline?: string | null;
  skills?: string[] | null;
  openToOpp?: boolean | null;
  isActive?: boolean | null;

  // Education
  school?: string | null;
  major?: string | null;
  minor?: string | null;
  graduationYear?: string | null;
  gpa?: string | null;

  // Location & Preferences
  location?: string | null;
  workPreferences?: string[] | null;
  jobTypes?: string[] | null;

  // Experience & Activities
  experience?: string | null;
  extracurriculars?: string[] | null;
  certifications?: string[] | null;
  languages?: string[] | null;
  targetRolesV2?: string[] | null;
  interestIndustriesV2?: string[] | null;
  interestFunctionsV2?: string[] | null;
  skillsV2?: Array<{
    name: string;
    proficiency?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | string;
    evidenceSources?: string[];
  }> | null;
  experienceProjectsV2?: Array<{
    title?: string;
    organization?: string;
    type?: 'INTERNSHIP' | 'PART_TIME' | 'FULL_TIME' | 'LEADERSHIP' | 'PROJECT' | 'CLUB' | string;
    startDate?: string;
    endDate?: string;
    industry?: string;
    location?: string;
    bullets?: string[];
    skillsUsed?: string[];
  }> | null;
  professionalSummaryV2?: {
    summary?: string;
    targetRoleContext?: string;
    strengths?: string;
    standout?: string;
  } | null;
  jobSearchPreferencesV2?: {
    activelyLooking?: boolean;
    desiredStartDate?: string;
    willingToRelocate?: boolean;
    openToAdjacentRoles?: boolean;
    salaryMin?: number | null;
    salaryMax?: number | null;
    preferredLocations?: string[];
    workArrangements?: string[];
    jobTypes?: string[];
  } | null;

  // Personal
  bio?: string | null;
  profileImageUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  createdAt?: Date | null;

  // Onboarding
  onboardingSeen?: boolean | null;
  hasSeenWelcomePopup?: boolean | null; // Legacy field for backward compatibility

  // Keep this so pages don't explode if we forgot a field somewhere
  [key: string]: any;
}
