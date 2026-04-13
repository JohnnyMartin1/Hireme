"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useProfileCompletion } from "@/components/ProfileCompletionProvider";
import { upsertDocument, getDocument } from '@/lib/firebase-firestore';
import { ArrowLeft, Save, GraduationCap, MapPin, Briefcase, Calendar, Globe, Award, BookOpen, User, Video, Share2, HelpCircle, Check } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/NotificationSystem';
import SearchableDropdown from '@/components/SearchableDropdown';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import LanguageSelector, { LanguageSkill } from '@/components/LanguageSelector';
import FileUpload from '@/components/FileUpload';
import VideoUpload from '@/components/VideoUpload';
import {
  UNIVERSITIES,
  MAJORS,
  MINORS,
  LOCATIONS,
  SKILLS,
  WORK_PREFERENCES,
  JOB_TYPES,
  GRADUATION_YEARS,
  GPA_RANGES,
  ALL_CERTIFICATIONS,
  CAREER_INTERESTS,
  LANGUAGES
} from '@/lib/profile-data';
import { buildNormalizedCandidateProfile } from '@/lib/matching/candidate-profile';

type SkillV2 = {
  name: string;
  proficiency?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | '';
  evidenceSources?: string[];
};

type ExperienceProjectV2 = {
  title: string;
  organization: string;
  type: 'INTERNSHIP' | 'PART_TIME' | 'FULL_TIME' | 'LEADERSHIP' | 'PROJECT' | 'CLUB' | '';
  startDate: string;
  endDate: string;
  industry: string;
  location: string;
  bullets: string[];
  skillsUsed: string[];
};

const TARGET_ROLE_OPTIONS = [
  'Software Engineer',
  'Product Manager',
  'Data Analyst',
  'Business Analyst',
  'Financial Analyst',
  'UX Designer',
  'UI Designer',
  'Graphic Designer',
  'Marketing Coordinator',
  'Sales Development Representative',
  'Operations Analyst',
  'Project Manager',
  'Investment Banking Analyst',
  'FP&A Analyst',
  'Recruiter',
];

const EVIDENCE_SOURCE_OPTIONS = [
  'coursework',
  'internship',
  'work',
  'project',
  'club',
  'certification',
  'self-taught',
];

interface ProfileFormData {
  firstName: string;
  lastName: string;
  headline: string;
  skills: string[];
  // Education
  education: Array<{
    school: string;
    degree: string;
    majors: string[];
    minors: string[];
    graduationYear: string;
    gpa: string;
  }>;
  // Location & Preferences
  locations: string[];
  workPreferences: string[];
  jobTypes: string[];
  // Extracurricular Activities
  experience: string;
  extracurriculars: string[];
  certifications: Array<{
    name: string;
    verificationLink?: string;
    verificationCode?: string;
  }>;
  languages: LanguageSkill[];
  // Career
  careerInterests: string[];
  targetRolesV2: string[];
  interestIndustriesV2: string[];
  interestFunctionsV2: string[];
  skillsV2: SkillV2[];
  experienceProjectsV2: ExperienceProjectV2[];
  professionalSummaryV2: {
    summary: string;
    targetRoleContext: string;
    strengths: string;
    standout: string;
  };
  jobSearchPreferencesV2: {
    activelyLooking: boolean;
    desiredStartDate: string;
    willingToRelocate: boolean;
    openToAdjacentRoles: boolean;
    salaryMin: string;
    salaryMax: string;
  };
  // Work Authorization
  workAuthorization: {
    authorizedToWork: boolean | null;
    requiresVisaSponsorship: boolean | null;
  };
  // Personal
  bio: string;
  linkedinUrl: string;
  portfolioUrl: string;
  // Files
  resumeUrl: string;
  profileImageUrl: string;
  videoUrl: string;
  transcriptUrl: string;
}

export default function EditProfilePage() {
  const { user, profile, loading, refreshProfile } = useFirebaseAuth();
  const { completion, updateCompletion } = useProfileCompletion();
  const router = useRouter();
  const toast = useToast();
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    headline: '',
    skills: [],
    education: [],
    locations: [],
    workPreferences: [],
    jobTypes: [],
    experience: '',
    extracurriculars: [],
    certifications: [],
    languages: [],
    careerInterests: [],
    targetRolesV2: [],
    interestIndustriesV2: [],
    interestFunctionsV2: [],
    skillsV2: [],
    experienceProjectsV2: [],
    professionalSummaryV2: {
      summary: '',
      targetRoleContext: '',
      strengths: '',
      standout: ''
    },
    jobSearchPreferencesV2: {
      activelyLooking: true,
      desiredStartDate: '',
      willingToRelocate: false,
      openToAdjacentRoles: true,
      salaryMin: '',
      salaryMax: ''
    },
    workAuthorization: {
      authorizedToWork: null,
      requiresVisaSponsorship: null
    },
    bio: '',
    linkedinUrl: '',
    portfolioUrl: '',
    resumeUrl: '',
    profileImageUrl: '',
    videoUrl: '',
    transcriptUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const adjacentRoleSuggestions = (() => {
    const normalized = formData.targetRolesV2.map((r) => r.toLowerCase());
    const has = (t: string) => normalized.some((r) => r.includes(t));
    if (has('design')) return ['Product Designer', 'Visual Designer', 'UX Designer', 'UI Designer'];
    if (has('analyst') || has('finance')) return ['Financial Analyst', 'Business Analyst', 'FP&A Analyst', 'Data Analyst'];
    if (has('engineer') || has('developer')) return ['Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer'];
    if (has('marketing')) return ['Growth Marketing', 'Brand Marketing', 'Product Marketing'];
    return ['Product Manager', 'Operations Analyst', 'Business Analyst'];
  })();

  // Helper functions to check section completion
  const isBasicInfoComplete = () => {
    return formData.firstName.trim() !== '' && 
           formData.lastName.trim() !== '' && 
           formData.headline.trim() !== '';
  };

  const isEducationComplete = () => {
    return formData.education.length > 0 && 
           formData.education.every(edu => 
             edu.school.trim() !== '' && 
             edu.degree.trim() !== '' && 
             edu.majors.length > 0 && 
             edu.graduationYear.trim() !== '' &&
             edu.gpa.trim() !== ''
           );
  };

  const isLocationComplete = () => {
    return formData.locations.length > 0 && 
           formData.workPreferences.length > 0 && 
           formData.jobTypes.length > 0;
  };

  const isSkillsComplete = () => {
    return formData.skills.length > 0;
  };

  const isTargetRolesComplete = () => {
    return formData.targetRolesV2.length > 0;
  };

  const isExperienceComplete = () => {
    return formData.experience.trim() !== '' ||
           formData.experienceProjectsV2.length > 0 ||
           formData.extracurriculars.length > 0 || 
           formData.certifications.length > 0 || 
           formData.languages.length > 0;
  };

  const isCareerInterestsComplete = () => {
    return formData.careerInterests.length > 0;
  };

  const isWorkAuthComplete = () => {
    return formData.workAuthorization.authorizedToWork != null || 
           formData.workAuthorization.requiresVisaSponsorship != null;
  };

  const isPersonalComplete = () => {
    return formData.bio.trim() !== '';
  };

  const isFilesComplete = () => {
    return formData.profileImageUrl.trim() !== '' && 
           formData.resumeUrl.trim() !== '';
  };

  const isVideoComplete = () => {
    return formData.videoUrl.trim() !== '';
  };

  const isEndorsementsComplete = () => {
    return true; // Endorsements section is always considered complete as it's just sharing
  };

  // Recompute completion percentage whenever formData changes (real-time updates)
  useEffect(() => {
    updateCompletion(formData);
  }, [formData, updateCompletion]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    // Fetch the latest profile data directly from Firestore to ensure we have the most up-to-date information
    const fetchLatestProfile = async () => {
      if (user) {
        try {
          const { data: latestProfile, error } = await getDocument('users', user.uid);
          if (error) {
            console.error('Error fetching latest profile:', error);
            return;
          }
          
          if (latestProfile) {
            console.log('Loading profile data into form:', latestProfile);
            const profile = latestProfile as any;
            setFormData({
              firstName: profile.firstName || '',
              lastName: profile.lastName || '',
              headline: profile.headline || '',
              skills: profile.skills || [],
              education: profile.education || (profile.school ? [{
                school: profile.school || '',
                degree: profile.degree || 'Bachelor\'s',
                majors: profile.majors || (profile.major ? [profile.major] : []),
                minors: profile.minors || (profile.minor ? [profile.minor] : []),
                graduationYear: profile.graduationYear || '',
                gpa: profile.gpa || ''
              }] : []),
              locations: profile.locations || (profile.location ? [profile.location] : []),
              workPreferences: profile.workPreferences || [],
              jobTypes: profile.jobTypes || [],
        experience: profile.experience || '',
        extracurriculars: profile.extracurriculars || [],
        certifications: profile.certifications ? (Array.isArray(profile.certifications) && profile.certifications.length > 0 && typeof profile.certifications[0] === 'string'
          ? (profile.certifications as string[]).map(name => ({ name })).filter(cert => cert.name.trim() !== '')
          : (profile.certifications as Array<{name: string; verificationLink?: string; verificationCode?: string}>).filter(cert => cert.name && cert.name.trim() !== '')) as Array<{name: string; verificationLink?: string; verificationCode?: string}> : [],
        languages: profile.languages ? (
          Array.isArray(profile.languages) && profile.languages.length > 0 && typeof profile.languages[0] === 'object'
            ? (profile.languages as LanguageSkill[])
            : (profile.languages as string[]).map(lang => ({
                language: lang,
                listening: 3,
                writing: 3,
                speaking: 3,
                comprehension: 3
              }))
        ) : [],
        careerInterests: profile.careerInterests || [],
        targetRolesV2: profile.targetRolesV2 || [],
        workAuthorization: profile.workAuthorization || {
          authorizedToWork: null,
          requiresVisaSponsorship: null
        },
        bio: profile.bio || '',
              interestIndustriesV2: profile.interestIndustriesV2 || profile.careerInterests || [],
              interestFunctionsV2: profile.interestFunctionsV2 || [],
              skillsV2: Array.isArray(profile.skillsV2) ? profile.skillsV2 : [],
              experienceProjectsV2: Array.isArray(profile.experienceProjectsV2) ? profile.experienceProjectsV2 : [],
              professionalSummaryV2: profile.professionalSummaryV2 || {
                summary: profile.bio || '',
                targetRoleContext: '',
                strengths: '',
                standout: ''
              },
              jobSearchPreferencesV2: profile.jobSearchPreferencesV2 || {
                activelyLooking: true,
                desiredStartDate: '',
                willingToRelocate: false,
                openToAdjacentRoles: true,
                salaryMin: '',
                salaryMax: ''
              },
              linkedinUrl: profile.linkedinUrl || '',
              portfolioUrl: profile.portfolioUrl || '',
              resumeUrl: profile.resumeUrl || '',
              profileImageUrl: profile.profileImageUrl || '',
              videoUrl: profile.videoUrl || '',
              transcriptUrl: profile.transcriptUrl || ''
            });
          }
        } catch (err) {
          console.error('Error fetching latest profile:', err);
        }
      }
    };

    fetchLatestProfile();
  }, [user, loading]);

  const handleInputChange = (field: keyof ProfileFormData, value: string | string[] | any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setIsSubmitting(true);
    try {
      // Filter out empty certifications before saving. Include role/email so a missing user doc is created correctly.
      const dataToSave = {
        ...formData,
        professionalSummaryV2: {
          ...formData.professionalSummaryV2,
          summary: formData.professionalSummaryV2.summary || formData.bio
        },
        certifications: formData.certifications.filter(cert => cert.name && cert.name.trim() !== ''),
        email: user.email,
        ...(profile?.role && { role: profile.role })
      };
      const normalized = buildNormalizedCandidateProfile(user.uid, dataToSave as Record<string, unknown>);
      (dataToSave as any).matchingNormalization = {
        candidateId: normalized.candidateId,
        targetRoles: normalized.targetRoles,
        normalizedRoles: normalized.normalizedRoles,
        normalizedSkills: normalized.normalizedSkills,
        normalizedFunctions: normalized.normalizedFunctions,
        normalizedIndustries: normalized.normalizedIndustries,
        structuredExperienceSignals: normalized.structuredExperienceSignals,
        skillEvidenceSignals: normalized.skillEvidenceSignals,
        preferenceSignals: normalized.preferenceSignals,
        normalizedMajors: normalized.normalizedMajors,
        normalizedDegrees: normalized.normalizedDegrees,
        recruiterConfidenceSignals: normalized.recruiterConfidenceSignals,
        educationKeywords: normalized.educationKeywords,
        experienceKeywords: normalized.experienceKeywords,
        normalizedSummary: normalized.normalizedSummary,
        updatedAt: new Date().toISOString(),
      };
      const { error } = await upsertDocument('users', user.uid, dataToSave);
      
      if (error) {
        console.error('Error updating profile:', error);
        toast.error('Update Failed', 'Failed to update profile. Please try again.');
      } else {
        toast.success('Profile Updated', 'Your profile has been saved successfully!');
        
        // Update the shared completion state with the saved data (use filtered data)
        updateCompletion(dataToSave);
        
        // Refresh the profile data in the auth context (non-blocking)
        refreshProfile().catch((err) => {
          console.error('Failed to refresh profile after save:', err);
        });
        
        // Redirect to appropriate dashboard based on role
        const dashboardRoute = profile.role === 'JOB_SEEKER'
          ? '/home/seeker'
          : (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER')
          ? '/home/employer'
          : '/home';

        router.push(dashboardRoute);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Update Failed', 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <button
            onClick={() => {
              if (profile?.role === 'JOB_SEEKER') {
                router.push('/home/seeker');
              } else if (profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER') {
                router.push('/home/employer');
              } else {
                router.push('/home');
              }
            }}
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[48px]"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm sm:text-base hidden sm:inline">Back to Dashboard</span>
            <span className="font-medium text-sm sm:text-base sm:hidden">Back</span>
          </button>
          <Link href="/" className="shrink-0" aria-label="HireMe home">
            <img src="/logo.svg" alt="HireMe logo" className="h-7 sm:h-8 w-auto" role="img" aria-label="HireMe logo" />
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-10">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6 lg:mb-10">
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-navy-900 tracking-tight">Build Your Match-Ready Profile</h1>
          <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg">Complete one rich profile once so recruiters can decide quickly whether to message or interview you.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar - Profile Completion */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 sm:p-5 lg:p-6 lg:sticky lg:top-24">
              <h2 className="text-base sm:text-lg font-bold text-navy-900 mb-3 sm:mb-4">Profile Completion</h2>
              <div className="flex items-center justify-center mb-3 sm:mb-4">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="profileCompletionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#1e3a5f" />
                        <stop offset="100%" stopColor="#0ea5e9" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="45" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="45" 
                      stroke="url(#profileCompletionGradient)" 
                      strokeWidth="8" 
                      fill="none" 
                      strokeLinecap="round" 
                      strokeDasharray={`${(completion / 100) * 282.74} 282.74`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl sm:text-2xl font-bold text-navy-900">{completion}%</span>
                  </div>
                </div>
              </div>
              <p className="text-slate-600 text-xs sm:text-sm text-center">Matching profile quality score</p>
            </div>
          </div>

          {/* Main Form Area */}
          <div className="lg:col-span-3 order-1 lg:order-2">

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 sm:p-6 lg:p-8">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-navy-900">Professional Headline & Summary</h3>
                <p className="text-slate-600 text-xs sm:text-sm">This is the first thing matching and recruiters use to understand your direction.</p>
              </div>
              {isBasicInfoComplete() && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-navy-900 mb-2">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full h-11 sm:h-12 px-4 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all text-base"
                  placeholder="John"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-navy-900 mb-2">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full h-11 sm:h-12 px-4 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all text-base"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-navy-900 mb-2">Professional Headline</label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => handleInputChange('headline', e.target.value)}
                className="w-full h-11 sm:h-12 px-4 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all text-base"
                placeholder="e.g., Computer Science Student | Full-Stack Developer"
              />
              <p className="text-xs text-slate-500 mt-2">Tell recruiters what role you are best positioned for in one line.</p>
            </div>

            <div className="mt-4">
              <label className="block text-xs sm:text-sm font-medium text-navy-900 mb-2">Professional Summary</label>
              <textarea
                value={formData.professionalSummaryV2.summary || formData.bio}
                onChange={(e) => {
                  handleInputChange('bio', e.target.value);
                  handleInputChange('professionalSummaryV2', {
                    ...formData.professionalSummaryV2,
                    summary: e.target.value
                  });
                }}
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all resize-none"
                placeholder="Describe what roles you want, your strongest skills, and your most relevant experience."
              />
              <p className="text-xs text-slate-500 mt-2">Be specific: include exact roles you want, your top 2-3 skills, and one strong experience/project result.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <input
                value={formData.professionalSummaryV2.targetRoleContext}
                onChange={(e) => handleInputChange('professionalSummaryV2', { ...formData.professionalSummaryV2, targetRoleContext: e.target.value })}
                className="w-full h-11 px-4 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder="Roles you're targeting most"
              />
              <input
                value={formData.professionalSummaryV2.strengths}
                onChange={(e) => handleInputChange('professionalSummaryV2', { ...formData.professionalSummaryV2, strengths: e.target.value })}
                className="w-full h-11 px-4 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder="Strongest 2-3 skills"
              />
            </div>
          </div>

          {/* Target Roles */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 sm:p-6 lg:p-8">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-navy-900">Target Roles</h3>
                <p className="text-slate-600 text-xs sm:text-sm">Select the roles you most want recruiters to contact you about.</p>
              </div>
              {isTargetRolesComplete() && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              )}
            </div>
            <MultiSelectDropdown
              options={TARGET_ROLE_OPTIONS}
              values={formData.targetRolesV2}
              onChange={(values) => handleInputChange('targetRolesV2', values.slice(0, 5))}
              placeholder="e.g. Financial Analyst, Product Analyst, UX Designer"
              label={`Target Roles (${formData.targetRolesV2.length}/5)`}
              allowCustom
              maxSelections={5}
            />
            <p className="text-xs text-slate-500 mt-2">Keep this focused. These roles heavily influence ranking and recruiter outreach relevance.</p>
            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-2">Adjacent-role suggestions (optional):</p>
              <div className="flex flex-wrap gap-2">
                {adjacentRoleSuggestions
                  .filter((role) => !formData.targetRolesV2.includes(role))
                  .slice(0, 4)
                  .map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleInputChange('targetRolesV2', [...formData.targetRolesV2, role].slice(0, 5))}
                      className="px-2.5 py-1 text-xs rounded-full border border-sky-200 bg-sky-50 text-navy-800 hover:bg-sky-100"
                    >
                      + {role}
                    </button>
                  ))}
              </div>
            </div>
            <div className="mt-4">
              <MultiSelectDropdown
                options={CAREER_INTERESTS}
                values={formData.interestFunctionsV2}
                onChange={(values) => handleInputChange('interestFunctionsV2', values.slice(0, 8))}
                placeholder="e.g. Financial Analysis, Product Design, Underwriting"
                label="Function Interests"
                allowCustom
                maxSelections={8}
              />
              <p className="text-xs text-slate-500 mt-2">Function interests describe what type of work you want to do (different from industries and target roles).</p>
            </div>
          </div>

          {/* Education */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 sm:p-6 lg:p-8">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-navy-900">Education</h3>
                <p className="text-slate-600 text-xs sm:text-sm">Your academic background and achievements</p>
              </div>
              {isEducationComplete() && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex justify-end mb-4 sm:mb-6">
              <button
                type="button"
                onClick={() => {
                  const newEducation = [...formData.education, {
                    school: '',
                    degree: 'Bachelor\'s',
                    majors: [],
                    minors: [],
                    graduationYear: '',
                    gpa: ''
                  }];
                  handleInputChange('education', newEducation);
                }}
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-navy-800 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-navy-700 transition-colors shadow-sm min-h-[44px]"
              >
                Add Education
              </button>
            </div>
            
            {formData.education.map((edu, index) => (
              <div key={index} className="border border-slate-200 rounded-xl p-4 sm:p-6 mb-4 bg-slate-50">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-navy-900">Education {index + 1}</h3>
                  {formData.education.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newEducation = formData.education.filter((_, i) => i !== index);
                        handleInputChange('education', newEducation);
                      }}
                      className="text-red-600 hover:text-red-700 text-xs sm:text-sm font-medium transition-colors min-h-[44px] px-2"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      University <span className="text-red-500">*</span>
                    </label>
                    <SearchableDropdown
                      options={UNIVERSITIES}
                      value={edu.school}
                      onChange={(value) => {
                        const newEducation = [...formData.education];
                        newEducation[index] = { ...edu, school: value };
                        handleInputChange('education', newEducation);
                      }}
                      placeholder="Select university"
                      label="University"
                      required
                      allowCustom
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Degree <span className="text-red-500">*</span>
                    </label>
                    <SearchableDropdown
                      options={['Bachelor\'s', 'Master\'s', 'PhD', 'Associate', 'Certificate', 'Other']}
                      value={edu.degree}
                      onChange={(value) => {
                        const newEducation = [...formData.education];
                        newEducation[index] = { ...edu, degree: value };
                        handleInputChange('education', newEducation);
                      }}
                      placeholder="Select degree type"
                      label="Degree Type"
                      required
                      allowCustom
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Majors
                    </label>
                    <MultiSelectDropdown
                      options={MAJORS}
                      values={edu.majors}
                      onChange={(values) => {
                        const newEducation = [...formData.education];
                        newEducation[index] = { ...edu, majors: values };
                        handleInputChange('education', newEducation);
                      }}
                      placeholder="Select majors"
                      label="Majors"
                      allowCustom
                      maxSelections={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minors
                    </label>
                    <MultiSelectDropdown
                      options={MINORS}
                      values={edu.minors}
                      onChange={(values) => {
                        const newEducation = [...formData.education];
                        newEducation[index] = { ...edu, minors: values };
                        handleInputChange('education', newEducation);
                      }}
                      placeholder="Select minors (optional)"
                      label="Minors"
                      allowCustom
                      maxSelections={2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Graduation Year <span className="text-red-500">*</span>
                    </label>
                    <SearchableDropdown
                      options={GRADUATION_YEARS}
                      value={edu.graduationYear}
                      onChange={(value) => {
                        const newEducation = [...formData.education];
                        newEducation[index] = { ...edu, graduationYear: value };
                        handleInputChange('education', newEducation);
                      }}
                      placeholder="Select graduation year"
                      label="Graduation Year"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GPA <span className="text-red-500">*</span>
                    </label>
                    <SearchableDropdown
                      options={GPA_RANGES}
                      value={edu.gpa}
                      onChange={(value) => {
                        const newEducation = [...formData.education];
                        newEducation[index] = { ...edu, gpa: value };
                        handleInputChange('education', newEducation);
                      }}
                      placeholder="Select GPA range"
                      label="GPA Range"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {/* Transcript Upload */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <label className="block text-sm font-medium text-gray-700 mb-4">Academic Transcript</label>
              <FileUpload
                type="transcript"
                currentFile={formData.transcriptUrl}
                onUploadComplete={(url) => handleInputChange('transcriptUrl', url)}
                onDelete={() => handleInputChange('transcriptUrl', '')}
                userId={user.uid}
              />
              <p className="text-xs text-gray-500 mt-2">
                Upload your official academic transcript (PDF format, max 5MB)
              </p>
            </div>
            
            {formData.education.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="font-medium text-navy-900">No education added yet</p>
                <p className="text-sm mt-1">Click "Add Education" to get started</p>
              </div>
            )}
          </div>

          {/* Location & Preferences */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <MapPin className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Location & Work Preferences</h3>
                <p className="text-slate-600 text-sm">Where and how you'd like to work</p>
              </div>
              {!isLocationComplete() && (
                <span className="text-xs font-semibold tracking-wider text-orange-700 bg-orange-100 px-3 py-1 rounded-full uppercase">Required</span>
              )}
              {isLocationComplete() && (
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MultiSelectDropdown
                options={LOCATIONS}
                values={formData.locations}
                onChange={(values) => handleInputChange('locations', values)}
                placeholder="Select preferred work locations"
                label="Preferred Work Locations"
                allowCustom
                maxSelections={5}
              />
              
              <MultiSelectDropdown
                options={WORK_PREFERENCES}
                values={formData.workPreferences}
                onChange={(values) => handleInputChange('workPreferences', values)}
                placeholder="Select work arrangements"
                label="Work Arrangements"
                allowCustom
              />
            </div>

            <div className="mt-6">
              <MultiSelectDropdown
                options={JOB_TYPES}
                values={formData.jobTypes}
                onChange={(values) => handleInputChange('jobTypes', values)}
                placeholder="Select job types"
                label="Job Types"
                allowCustom
              />
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Award className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Skills</h3>
                <p className="text-slate-600 text-sm">Add your strongest job-relevant skills so recruiters can assess fit at a glance.</p>
              </div>
              {!isSkillsComplete() && (
                <span className="text-xs font-semibold tracking-wider text-orange-700 bg-orange-100 px-3 py-1 rounded-full uppercase">Required</span>
              )}
              {isSkillsComplete() && (
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            
            <MultiSelectDropdown
              options={SKILLS}
              values={formData.skills}
              onChange={(values) => handleInputChange('skills', values)}
              placeholder="Select your skills"
              label="Technical & Professional Skills"
              allowCustom
              maxSelections={20}
            />
            
            <div className="mt-6">
              <LanguageSelector
                options={LANGUAGES}
                values={formData.languages}
                onChange={(values) => handleInputChange('languages', values)}
                placeholder="Select languages you speak"
                label="Languages"
                allowCustom
                maxSelections={10}
              />
            </div>
            <p className="text-xs text-slate-500 mt-3">Tip: prioritize skills you can prove through internships, projects, clubs, or coursework.</p>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <h4 className="text-sm font-semibold text-navy-900 mb-2">Structured Skill Evidence (optional but recommended)</h4>
              <p className="text-xs text-slate-500 mb-3">Add proficiency and evidence source so recruiters can trust your top skills.</p>
              <div className="space-y-3">
                {formData.skillsV2.map((s, idx) => (
                  <div key={`sv2-${idx}`} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                      value={s.name}
                      onChange={(e) => {
                        const next = [...formData.skillsV2];
                        next[idx] = { ...next[idx], name: e.target.value };
                        handleInputChange('skillsV2', next);
                      }}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                      placeholder="Skill"
                    />
                    <select
                      value={s.proficiency || ''}
                      onChange={(e) => {
                        const next = [...formData.skillsV2];
                        next[idx] = { ...next[idx], proficiency: e.target.value as SkillV2['proficiency'] };
                        handleInputChange('skillsV2', next);
                      }}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    >
                      <option value="">Proficiency</option>
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                    <MultiSelectDropdown
                      options={EVIDENCE_SOURCE_OPTIONS}
                      values={s.evidenceSources || []}
                      onChange={(values) => {
                        const next = [...formData.skillsV2];
                        next[idx] = { ...next[idx], evidenceSources: values };
                        handleInputChange('skillsV2', next);
                      }}
                      placeholder="Evidence source(s)"
                      label=""
                      allowCustom={false}
                      maxSelections={4}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleInputChange('skillsV2', [...formData.skillsV2, { name: '', proficiency: '', evidenceSources: [] }])}
                  className="text-sm text-navy-700 hover:text-navy-900"
                >
                  + Add structured skill
                </button>
              </div>
            </div>
          </div>

          {/* Experience & Projects */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Briefcase className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Experience & Projects</h3>
                <p className="text-slate-600 text-sm">Add internships, projects, jobs, clubs, or leadership roles that prove your fit.</p>
              </div>
              {!isExperienceComplete() && (
                <span className="text-xs font-semibold tracking-wider text-orange-700 bg-orange-100 px-3 py-1 rounded-full uppercase">Required</span>
              )}
              {isExperienceComplete() && (
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Experience / Project Evidence</label>
            <textarea
              value={formData.experience}
              onChange={(e) => handleInputChange('experience', e.target.value)}
              rows={5}
              className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all resize-none"
              placeholder="Use bullets with impact: what you did, tools used, outcomes, and leadership/ownership."
            />
            {!formData.experience.trim() && (
              <p className="text-xs text-slate-500 mt-2">Example: Built valuation model in Excel for 8 deals, reduced analysis turnaround by 25%.</p>
            )}

            <div className="mt-6 border-t border-slate-100 pt-4">
              <h4 className="text-sm font-semibold text-navy-900 mb-2">Structured Experience Entries</h4>
              <p className="text-xs text-slate-500 mb-3">Add internships, projects, jobs, clubs, or leadership entries with skills used.</p>
              <div className="space-y-4">
                {formData.experienceProjectsV2.map((exp, idx) => (
                  <div key={`expv2-${idx}`} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                      <input value={exp.title} onChange={(e) => {
                        const next = [...formData.experienceProjectsV2];
                        next[idx] = { ...next[idx], title: e.target.value };
                        handleInputChange('experienceProjectsV2', next);
                      }} className="px-3 py-2 rounded border border-slate-200 text-sm" placeholder="Title" />
                      <input value={exp.organization} onChange={(e) => {
                        const next = [...formData.experienceProjectsV2];
                        next[idx] = { ...next[idx], organization: e.target.value };
                        handleInputChange('experienceProjectsV2', next);
                      }} className="px-3 py-2 rounded border border-slate-200 text-sm" placeholder="Organization" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                      <select value={exp.type} onChange={(e) => {
                        const next = [...formData.experienceProjectsV2];
                        next[idx] = { ...next[idx], type: e.target.value as ExperienceProjectV2['type'] };
                        handleInputChange('experienceProjectsV2', next);
                      }} className="px-3 py-2 rounded border border-slate-200 text-sm">
                        <option value="">Type</option>
                        <option value="INTERNSHIP">Internship</option>
                        <option value="PART_TIME">Part-time</option>
                        <option value="FULL_TIME">Full-time</option>
                        <option value="LEADERSHIP">Leadership</option>
                        <option value="PROJECT">Project</option>
                        <option value="CLUB">Club</option>
                      </select>
                      <input value={exp.startDate} onChange={(e) => {
                        const next = [...formData.experienceProjectsV2];
                        next[idx] = { ...next[idx], startDate: e.target.value };
                        handleInputChange('experienceProjectsV2', next);
                      }} className="px-3 py-2 rounded border border-slate-200 text-sm" placeholder="Start date" />
                      <input value={exp.endDate} onChange={(e) => {
                        const next = [...formData.experienceProjectsV2];
                        next[idx] = { ...next[idx], endDate: e.target.value };
                        handleInputChange('experienceProjectsV2', next);
                      }} className="px-3 py-2 rounded border border-slate-200 text-sm" placeholder="End date / Present" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                      <input value={exp.industry} onChange={(e) => {
                        const next = [...formData.experienceProjectsV2];
                        next[idx] = { ...next[idx], industry: e.target.value };
                        handleInputChange('experienceProjectsV2', next);
                      }} className="px-3 py-2 rounded border border-slate-200 text-sm" placeholder="Industry" />
                      <input value={exp.location} onChange={(e) => {
                        const next = [...formData.experienceProjectsV2];
                        next[idx] = { ...next[idx], location: e.target.value };
                        handleInputChange('experienceProjectsV2', next);
                      }} className="px-3 py-2 rounded border border-slate-200 text-sm" placeholder="Location" />
                    </div>
                    <textarea value={exp.bullets.join('\n')} onChange={(e) => {
                      const next = [...formData.experienceProjectsV2];
                      next[idx] = { ...next[idx], bullets: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 5) };
                      handleInputChange('experienceProjectsV2', next);
                    }} rows={3} className="w-full px-3 py-2 rounded border border-slate-200 text-sm mb-2" placeholder="3-5 bullet points (one per line)" />
                    <p className="text-[11px] text-slate-500 mb-2">Use 2-5 bullets with outcomes when possible (impact, scope, or metrics).</p>
                    <input value={exp.skillsUsed.join(', ')} onChange={(e) => {
                      const next = [...formData.experienceProjectsV2];
                      next[idx] = { ...next[idx], skillsUsed: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) };
                      handleInputChange('experienceProjectsV2', next);
                    }} className="w-full px-3 py-2 rounded border border-slate-200 text-sm" placeholder="Skills used (comma-separated)" />
                    <button
                      type="button"
                      onClick={() => handleInputChange('experienceProjectsV2', formData.experienceProjectsV2.filter((_, i) => i !== idx))}
                      className="mt-2 text-xs text-red-600 hover:text-red-700"
                    >
                      Remove entry
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleInputChange('experienceProjectsV2', [...formData.experienceProjectsV2, { title: '', organization: '', type: '', startDate: '', endDate: '', industry: '', location: '', bullets: [], skillsUsed: [] }])}
                  className="text-sm text-navy-700 hover:text-navy-900"
                >
                  + Add structured experience
                </button>
              </div>
            </div>
          </div>

          {/* Certifications */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <Award className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Certifications</h3>
                <p className="text-slate-600 text-sm">Add professional certifications with verification proof</p>
              </div>
            </div>

            <div className="space-y-4">
              {formData.certifications.map((cert, index) => (
                <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={cert.name}
                        onChange={(e) => {
                          const updated = [...formData.certifications];
                          updated[index] = { ...updated[index], name: e.target.value };
                          handleInputChange('certifications', updated);
                        }}
                        placeholder="Certification name (e.g., AWS Certified Solutions Architect)"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-sm font-medium"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.certifications.filter((_, i) => i !== index);
                        handleInputChange('certifications', updated);
                      }}
                      className="ml-3 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Verification Link (optional)</label>
                      <input
                        type="url"
                        value={cert.verificationLink || ''}
                        onChange={(e) => {
                          const updated = [...formData.certifications];
                          updated[index] = { ...updated[index], verificationLink: e.target.value };
                          handleInputChange('certifications', updated);
                        }}
                        placeholder="https://verify.example.com/cert/..."
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Verification Code (optional)</label>
                      <input
                        type="text"
                        value={cert.verificationCode || ''}
                        onChange={(e) => {
                          const updated = [...formData.certifications];
                          updated[index] = { ...updated[index], verificationCode: e.target.value };
                          handleInputChange('certifications', updated);
                        }}
                        placeholder="ABC-123-XYZ or Certificate ID"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Provide either a verification link or code to prove your certification</p>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => {
                  const updated = [...formData.certifications, { name: '' }];
                  handleInputChange('certifications', updated);
                }}
                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-medium">Add Certification</span>
              </button>
            </div>
          </div>

          {/* Endorsements, Certifications & Extracurriculars */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Briefcase className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Endorsements, Certifications & Extracurriculars</h3>
                <p className="text-slate-600 text-sm">These proof signals help recruiters trust your profile and differentiate you.</p>
              </div>
              {!isExperienceComplete() && (
                <span className="text-xs font-semibold tracking-wider text-orange-700 bg-orange-100 px-3 py-1 rounded-full uppercase">Required</span>
              )}
              {isExperienceComplete() && (
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-navy-900 mb-2">
                Extracurricular Activities
              </label>
              <textarea
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all resize-none"
                placeholder="Describe clubs, competitions, volunteer work, and leadership that strengthen your candidacy."
              />
            </div>
          </div>

          {/* Career Interests */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Briefcase className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Career Interests (Industries)</h3>
                <p className="text-slate-600 text-sm">Industries are separate from target roles and functions. Choose sectors where you want to work.</p>
              </div>
              {!isCareerInterestsComplete() && (
                <span className="text-xs font-semibold tracking-wider text-orange-700 bg-orange-100 px-3 py-1 rounded-full uppercase">Required</span>
              )}
              {isCareerInterestsComplete() && (
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            
            <div>
              <MultiSelectDropdown
                options={CAREER_INTERESTS}
                values={formData.careerInterests}
                onChange={(values) => handleInputChange('careerInterests', values)}
                placeholder="Select career industries you're interested in"
                label="Industries of Interest"
                allowCustom
                maxSelections={5}
              />
              <p className="text-sm text-slate-500 mt-2">
                Select up to 5 interests. Recruiters will use this to judge long-term fit and motivation.
              </p>
              <div className="mt-4">
                <MultiSelectDropdown
                  options={CAREER_INTERESTS}
                  values={formData.interestIndustriesV2}
                  onChange={(values) => handleInputChange('interestIndustriesV2', values.slice(0, 6))}
                  placeholder="Industries of interest"
                  label="Industries of Interest (V2)"
                  allowCustom
                  maxSelections={6}
                />
              </div>
            </div>
          </div>

          {/* Job Search Preferences V2 */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Calendar className="h-6 w-6 text-navy-700" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-navy-900">Job Search Preferences</h3>
                <p className="text-slate-600 text-sm">These are normalized for matching and help recruiters contact you for the right opportunities.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm text-navy-900">
                <input type="checkbox" checked={formData.jobSearchPreferencesV2.activelyLooking} onChange={(e) => handleInputChange('jobSearchPreferencesV2', { ...formData.jobSearchPreferencesV2, activelyLooking: e.target.checked })} />
                Actively looking
              </label>
              <label className="flex items-center gap-2 text-sm text-navy-900">
                <input type="checkbox" checked={formData.jobSearchPreferencesV2.openToAdjacentRoles} onChange={(e) => handleInputChange('jobSearchPreferencesV2', { ...formData.jobSearchPreferencesV2, openToAdjacentRoles: e.target.checked })} />
                Open to adjacent roles
              </label>
              <label className="flex items-center gap-2 text-sm text-navy-900">
                <input type="checkbox" checked={formData.jobSearchPreferencesV2.willingToRelocate} onChange={(e) => handleInputChange('jobSearchPreferencesV2', { ...formData.jobSearchPreferencesV2, willingToRelocate: e.target.checked })} />
                Willing to relocate
              </label>
              <input
                type="text"
                value={formData.jobSearchPreferencesV2.desiredStartDate}
                onChange={(e) => handleInputChange('jobSearchPreferencesV2', { ...formData.jobSearchPreferencesV2, desiredStartDate: e.target.value })}
                className="px-3 py-2 rounded border border-slate-200 text-sm"
                placeholder="Desired start date"
              />
              <input
                type="text"
                value={formData.jobSearchPreferencesV2.salaryMin}
                onChange={(e) => handleInputChange('jobSearchPreferencesV2', { ...formData.jobSearchPreferencesV2, salaryMin: e.target.value })}
                className="px-3 py-2 rounded border border-slate-200 text-sm"
                placeholder="Salary minimum (optional)"
              />
              <input
                type="text"
                value={formData.jobSearchPreferencesV2.salaryMax}
                onChange={(e) => handleInputChange('jobSearchPreferencesV2', { ...formData.jobSearchPreferencesV2, salaryMax: e.target.value })}
                className="px-3 py-2 rounded border border-slate-200 text-sm"
                placeholder="Salary maximum (optional)"
              />
            </div>
          </div>

          {/* Recruiter Preview */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-5">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                <HelpCircle className="h-6 w-6 text-indigo-700" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-navy-900">Recruiter Preview</h3>
                <p className="text-slate-600 text-sm">How employers will quickly understand your profile.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Target Roles</p>
                <p className="text-navy-900">{formData.targetRolesV2.length ? formData.targetRolesV2.join(', ') : 'Add up to 5 target roles'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Top Skills</p>
                <p className="text-navy-900">{formData.skills.length ? formData.skills.slice(0, 8).join(', ') : 'Add role-relevant skills recruiters can verify'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Experience Evidence</p>
                <p className="text-navy-900">
                  {formData.experienceProjectsV2.length
                    ? `${formData.experienceProjectsV2.length} structured entries`
                    : formData.experience.trim()
                      ? `${formData.experience.trim().slice(0, 140)}...`
                      : 'Add concrete experience bullets with outcomes.'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Readiness Signals</p>
                <p className="text-navy-900">
                  {formData.resumeUrl ? 'Resume' : 'No resume'} • {formData.videoUrl ? 'Video' : 'No video'} • {formData.transcriptUrl ? 'Transcript' : 'No transcript'} • {formData.workAuthorization.authorizedToWork == null ? 'Auth unknown' : formData.workAuthorization.authorizedToWork ? 'Authorized' : 'Needs authorization'}
                </p>
              </div>
            </div>
          </div>

          {/* Work Authorization */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Globe className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Work Authorization</h3>
                <p className="text-slate-600 text-sm">Your work eligibility status</p>
              </div>
              {!isWorkAuthComplete() && (
                <span className="text-xs font-semibold tracking-wider text-orange-700 bg-orange-100 px-3 py-1 rounded-full uppercase">Required</span>
              )}
              {isWorkAuthComplete() && (
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-3">Are you authorized to work in the United States?</label>
                <div className="flex gap-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="authorizedToWork"
                      value="yes"
                      checked={formData.workAuthorization.authorizedToWork === true}
                      onChange={(e) => handleInputChange('workAuthorization', {
                        ...formData.workAuthorization,
                        authorizedToWork: e.target.value === 'yes'
                      })}
                      className="w-4 h-4 text-navy-800 focus:ring-sky-200 border-slate-300"
                    />
                    <span className="ml-2 text-navy-900">Yes</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="authorizedToWork"
                      value="no"
                      checked={formData.workAuthorization.authorizedToWork === false}
                      onChange={(e) => handleInputChange('workAuthorization', {
                        ...formData.workAuthorization,
                        authorizedToWork: false
                      })}
                      className="w-4 h-4 text-navy-800 focus:ring-sky-200 border-slate-300"
                    />
                    <span className="ml-2 text-navy-900">No</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-3">Do you require sponsorship for employment visa status?</label>
                <div className="flex gap-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="requiresVisaSponsorship"
                      value="yes"
                      checked={formData.workAuthorization.requiresVisaSponsorship === true}
                      onChange={(e) => handleInputChange('workAuthorization', {
                        ...formData.workAuthorization,
                        requiresVisaSponsorship: e.target.value === 'yes'
                      })}
                      className="w-4 h-4 text-navy-800 focus:ring-sky-200 border-slate-300"
                    />
                    <span className="ml-2 text-navy-900">Yes</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="requiresVisaSponsorship"
                      value="no"
                      checked={formData.workAuthorization.requiresVisaSponsorship === false}
                      onChange={(e) => handleInputChange('workAuthorization', {
                        ...formData.workAuthorization,
                        requiresVisaSponsorship: false
                      })}
                      className="w-4 h-4 text-navy-800 focus:ring-sky-200 border-slate-300"
                    />
                    <span className="ml-2 text-navy-900">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <BookOpen className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Portfolio & Professional Links</h3>
                <p className="text-slate-600 text-sm">These links help recruiters validate your work quickly.</p>
              </div>
              {isPersonalComplete() && (
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                  className="w-full h-12 px-4 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">Portfolio/Website URL</label>
                <input
                  type="url"
                  value={formData.portfolioUrl}
                  onChange={(e) => handleInputChange('portfolioUrl', e.target.value)}
                  className="w-full h-12 px-4 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
                  placeholder="https://yourportfolio.com"
                />
              </div>
            </div>
          </div>

          {/* Profile Picture & Resume */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <User className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Profile Picture & Resume</h3>
                <p className="text-slate-600 text-sm">Upload your photo and resume to stand out</p>
              </div>
              {isFilesComplete() && (
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-4">Profile Picture</label>
                <FileUpload
                  type="profile-image"
                  currentFile={formData.profileImageUrl}
                  onUploadComplete={(url) => handleInputChange('profileImageUrl', url)}
                  onDelete={() => handleInputChange('profileImageUrl', '')}
                  userId={user.uid}
                />
              </div>

              {/* Resume */}
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-4">Resume</label>
                <FileUpload
                  type="resume"
                  currentFile={formData.resumeUrl}
                  onUploadComplete={(url) => handleInputChange('resumeUrl', url)}
                  onDelete={() => handleInputChange('resumeUrl', '')}
                  userId={user.uid}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">Resume, video, transcript, endorsements, certifications, and extracurriculars act as recruiter confidence signals.</p>
          </div>

          {/* Profile Video */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 sm:p-6 lg:p-8">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                <Video className="h-5 w-5 sm:h-6 sm:w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-navy-900">Profile Video</h3>
                <p className="text-slate-600 text-xs sm:text-sm">Record a short video to introduce yourself</p>
              </div>
              {isVideoComplete() && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              )}
            </div>

            {/* Prominent Call-to-Action Box - Optimized for Mobile */}
            {!isVideoComplete() && (
              <div className="mb-4 sm:mb-6 bg-gradient-to-br from-sky-50 to-blue-50 border-2 border-sky-300 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-500 rounded-full flex items-center justify-center">
                      <Video className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base sm:text-lg font-bold text-navy-900 mb-2">⭐ Add Your Profile Video</h4>
                    <p className="text-sm sm:text-base text-navy-800 leading-relaxed mb-3">
                      Your video helps employers gauge your personality and communication skills. Candidates with videos are <strong className="text-sky-600">significantly more likely</strong> to be contacted.
                    </p>
                    <div className="bg-white/60 rounded-lg p-3 sm:p-4 border border-sky-200">
                      <ul className="text-xs sm:text-sm text-navy-800 space-y-1.5">
                        <li className="flex items-start">
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-sky-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>See your communication style firsthand</span>
                        </li>
                        <li className="flex items-start">
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-sky-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Demonstrates professionalism</span>
                        </li>
                        <li className="flex items-start">
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-sky-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>3x more messages from employers</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-navy-900 mb-2 sm:mb-4">
                Profile Video {!isVideoComplete() && <span className="text-sky-600 font-semibold">(Highly Recommended)</span>} <span className="text-slate-500 font-normal">(Max 60 seconds)</span>
              </label>
              {!isVideoComplete() && (
                <p className="text-xs sm:text-sm text-slate-600 mb-3 sm:mb-4">
                  Record a brief introduction highlighting your skills and experience. Keep it under 60 seconds!
                </p>
              )}
              <VideoUpload
                currentVideo={formData.videoUrl}
                onUploadComplete={(url) => handleInputChange('videoUrl', url)}
                onDelete={() => handleInputChange('videoUrl', '')}
                userId={user.uid}
              />
            </div>
          </div>

          {/* Endorsements */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Award className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Endorsements</h3>
                <p className="text-slate-600 text-sm">Share your profile to get endorsements</p>
              </div>
              {isEndorsementsComplete() && (
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <div className="flex items-center text-sm text-slate-600 mb-2">
                <Share2 className="h-4 w-4 mr-2 text-navy-700" />
                <span>Share this link:</span>
              </div>
              <code className="block bg-white px-4 py-3 rounded-lg text-navy-900 font-mono text-sm border border-slate-200 break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/endorse/${user.uid}` : `/endorse/${user.uid}`}
              </code>
            </div>
            <p className="text-slate-600 mb-4">Send this link to colleagues, managers or peers so they can vouch for your skills.</p>
            <Link href={`/endorse/${user.uid}`} className="text-navy-800 hover:text-navy-600 font-medium transition-colors">
              Open endorsement form →
            </Link>
          </div>

          {/* Save All Changes */}
          <div className="bg-gradient-to-br from-navy-800 to-navy-900 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold">Ready to save?</h3>
                <p className="text-sky-200 mt-1">Review and save your profile updates</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 sm:flex-none px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors border border-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-6 py-3 bg-white text-navy-900 font-semibold rounded-lg hover:bg-sky-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </form>
          </div>
        </div>
      </main>
    </div>
  );
}