"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useProfileCompletion } from "@/components/ProfileCompletionProvider";
import { updateDocument, getDocument } from '@/lib/firebase-firestore';
import { ArrowLeft, Save, GraduationCap, MapPin, Briefcase, Calendar, Globe, Award, BookOpen, User, Video, Share2, HelpCircle, Check } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/NotificationSystem';
import SearchableDropdown from '@/components/SearchableDropdown';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
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
  CAREER_INTERESTS
} from '@/lib/profile-data';

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
  // Experience & Activities
  experience: string;
  extracurriculars: string[];
  certifications: string[];
  languages: string[];
  // Career
  careerInterests: string[];
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
    workAuthorization: {
      authorizedToWork: null,
      requiresVisaSponsorship: null
    },
    bio: '',
    linkedinUrl: '',
    portfolioUrl: '',
    resumeUrl: '',
    profileImageUrl: '',
    videoUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
             edu.graduationYear.trim() !== ''
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

  const isExperienceComplete = () => {
    return formData.experience.trim() !== '' || 
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
    return formData.bio.trim() !== '' || 
           formData.linkedinUrl.trim() !== '' || 
           formData.portfolioUrl.trim() !== '';
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
        certifications: profile.certifications || [],
        languages: profile.languages || [],
        careerInterests: profile.careerInterests || [],
        workAuthorization: profile.workAuthorization || {
          authorizedToWork: null,
          requiresVisaSponsorship: null
        },
        bio: profile.bio || '',
              linkedinUrl: profile.linkedinUrl || '',
              portfolioUrl: profile.portfolioUrl || '',
              resumeUrl: profile.resumeUrl || '',
              profileImageUrl: profile.profileImageUrl || '',
              videoUrl: profile.videoUrl || ''
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
      const { error } = await updateDocument('users', user.uid, formData);
      
      if (error) {
        console.error('Error updating profile:', error);
        toast.error('Update Failed', 'Failed to update profile. Please try again.');
      } else {
        toast.success('Profile Updated', 'Your profile has been saved successfully!');
        
        // Update the shared completion state with the saved data
        updateCompletion(formData);
        
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full" style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F0F8FF 100%)'}}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-light-gray/30 mobile-safe-top">
        <div className="w-full md:max-w-7xl md:mx-auto px-0 sm:px-3 md:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20 px-4 sm:px-0">
            <div className="flex items-center space-x-2 sm:space-x-4 md:space-x-6">
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
                className="flex items-center space-x-1 sm:space-x-2 text-navy hover:text-navy/80 transition-all duration-300 group px-2 sm:px-4 py-2 rounded-full hover:bg-light-blue/10 hover:shadow-md hover:scale-105 min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
                <span className="font-semibold text-sm sm:text-base hidden sm:inline">Back to Dashboard</span>
                <span className="font-semibold text-sm sm:hidden">Back</span>
              </button>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-navy rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-magnifying-glass text-white text-sm sm:text-lg"></i>
              </div>
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-navy">HireMe</span>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full md:max-w-7xl md:mx-auto px-0 sm:px-3 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 min-w-0">
        <div className="flex flex-col lg:flex-row gap-0 sm:gap-4 md:gap-6 lg:gap-8">
          <div className="flex-1 w-full min-w-0">
            {/* Page Header */}
            <div className="mb-4 sm:mb-6 md:mb-8 px-2 sm:px-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-navy mb-2">Edit Profile</h1>
              <p className="text-sm sm:text-base text-gray-600">Complete your profile to increase visibility and connect with top employers.</p>
            </div>
          
            {/* Profile Completion Card */}
            <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-light-gray/30 mb-3 sm:mb-6 md:mb-8">
              <div className="flex justify-between items-center mb-3 sm:mb-4 gap-2">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-navy">Profile Completion</h2>
                <span className="text-lg sm:text-xl md:text-2xl font-bold text-navy bg-light-blue/30 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full flex-shrink-0">{completion}%</span>
              </div>
              <div className="w-full bg-light-gray/30 rounded-full h-3 mb-3">
                <div className="bg-gradient-to-r from-navy to-light-blue h-3 rounded-full transition-all duration-500" style={{ width: `${completion}%` }}></div>
              </div>
              <p className="text-gray-600 text-sm">{Math.floor(completion / 10)} of 10 sections completed</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-light-gray/30 mb-3 sm:mb-6 md:mb-8">
            <div className="flex items-center mb-4 sm:mb-5 md:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-light-blue/30 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <User className="text-navy text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-navy">Basic Information</h3>
                <p className="text-gray-600 text-sm">Your core personal details</p>
              </div>
              {isBasicInfoComplete() && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="text-white text-sm" />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-light-blue/8 border border-light-blue/20 text-gray-800 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy focus:bg-light-blue/12 transition-all duration-200"
                  placeholder="John"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-light-blue/8 border border-light-blue/20 text-gray-800 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy focus:bg-light-blue/12 transition-all duration-200"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-navy mb-2">Professional Headline</label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => handleInputChange('headline', e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-light-blue/8 border border-light-blue/20 text-gray-800 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy focus:bg-light-blue/12 transition-all duration-200"
                placeholder="e.g., Computer Science Student | Full-Stack Developer"
              />
            </div>
          </div>

          {/* Education */}
          <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-light-gray/30 mb-3 sm:mb-6 md:mb-8">
            <div className="flex items-center mb-4 sm:mb-5 md:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-light-blue/30 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <GraduationCap className="text-navy text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-navy">Education</h3>
                <p className="text-gray-600 text-sm">Your academic background and achievements</p>
              </div>
              {isEducationComplete() && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="text-white text-sm" />
                </div>
              )}
            </div>
            
            <div className="flex justify-end mb-6">
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
                className="px-4 py-2 bg-navy text-white text-sm rounded-xl hover:bg-blue-900 transition-colors"
              >
                Add Education
              </button>
            </div>
            
            {formData.education.map((edu, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Education {index + 1}</h3>
                  {formData.education.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newEducation = formData.education.filter((_, i) => i !== index);
                        handleInputChange('education', newEducation);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  />
                </div>
              </div>
            ))}
            
            {formData.education.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No education added yet</p>
                <p className="text-sm">Click "Add Education" to get started</p>
              </div>
            )}
          </div>

          {/* Location & Preferences */}
          <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-light-gray/30 mb-3 sm:mb-6 md:mb-8">
            <div className="flex items-center mb-4 sm:mb-5 md:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-light-blue/30 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <MapPin className="text-navy text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-navy">Location & Work Preferences</h3>
                <p className="text-gray-600 text-sm">Where and how you'd like to work</p>
              </div>
              {!isLocationComplete() && (
                <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">Required</span>
              )}
              {isLocationComplete() && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="text-white text-sm" />
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
          <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-light-gray/30 mb-3 sm:mb-6 md:mb-8">
            <div className="flex items-center mb-4 sm:mb-5 md:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-light-blue/30 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <Award className="text-navy text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-navy">Skills & Expertise</h3>
                <p className="text-gray-600 text-sm">Technical and professional skills (up to 20)</p>
              </div>
              {!isSkillsComplete() && (
                <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">Required</span>
              )}
              {isSkillsComplete() && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="text-white text-sm" />
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
          </div>

          {/* Experience & Activities */}
          <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-light-gray/30 mb-3 sm:mb-6 md:mb-8">
            <div className="flex items-center mb-4 sm:mb-5 md:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-light-blue/30 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <Briefcase className="text-navy text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-navy">Experience & Activities</h3>
                <p className="text-gray-600 text-sm">Your professional and academic experiences</p>
              </div>
              {!isExperienceComplete() && (
                <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">Required</span>
              )}
              {isExperienceComplete() && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="text-white text-sm" />
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-navy mb-2">Relevant Experience</label>
              <textarea
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-light-blue/8 border border-light-blue/20 text-gray-800 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy focus:bg-light-blue/12 transition-all duration-200 resize-none"
                placeholder="Describe your relevant work experience, internships, projects, etc."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MultiSelectDropdown
                options={[]}
                values={formData.extracurriculars}
                onChange={(values) => handleInputChange('extracurriculars', values)}
                placeholder="Add extracurricular activities"
                label="Extracurricular Activities"
                allowCustom
              />
              
              <MultiSelectDropdown
                options={ALL_CERTIFICATIONS}
                values={formData.certifications}
                onChange={(values) => handleInputChange('certifications', values)}
                placeholder="Add certifications"
                label="Certifications"
                allowCustom
              />
              
              <MultiSelectDropdown
                options={[]}
                values={formData.languages}
                onChange={(values) => handleInputChange('languages', values)}
                placeholder="Add languages"
                label="Languages"
                allowCustom
              />
            </div>
          </div>

          {/* Career Interests */}
          <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-light-gray/30 mb-3 sm:mb-6 md:mb-8">
            <div className="flex items-center mb-4 sm:mb-5 md:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-light-blue/30 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <Briefcase className="text-navy text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-navy">Career Interests</h3>
                <p className="text-gray-600 text-sm">Industries and roles you're interested in (up to 5)</p>
              </div>
              {!isCareerInterestsComplete() && (
                <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">Required</span>
              )}
              {isCareerInterestsComplete() && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="text-white text-sm" />
                </div>
              )}
            </div>
            
            <div>
              <MultiSelectDropdown
                options={CAREER_INTERESTS}
                values={formData.careerInterests}
                onChange={(values) => handleInputChange('careerInterests', values)}
                placeholder="Select career industries you're interested in"
                label="Career Industries"
                allowCustom
                maxSelections={5}
              />
              <p className="text-sm text-gray-500 mt-2">
                Select up to 5 industries you're most interested in pursuing for your career.
              </p>
            </div>
          </div>

          {/* Work Authorization */}
          <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-light-gray/30 mb-3 sm:mb-6 md:mb-8">
            <div className="flex items-center mb-4 sm:mb-5 md:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-light-blue/30 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <HelpCircle className="text-navy text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-navy">Work Authorization</h3>
                <p className="text-gray-600 text-sm">Your work eligibility status</p>
              </div>
              {!isWorkAuthComplete() && (
                <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">Required</span>
              )}
              {isWorkAuthComplete() && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="text-white text-sm" />
                </div>
              )}
            </div>
            
            <div className="space-y-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-navy mb-3">Are you authorized to work in the United States?</label>
                <div className="flex space-x-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="authorizedToWork"
                      value="yes"
                      checked={formData.workAuthorization.authorizedToWork === true}
                      onChange={(e) => handleInputChange('workAuthorization', {
                        ...formData.workAuthorization,
                        authorizedToWork: e.target.value === 'yes'
                      })}
                      className="w-4 h-4 text-navy focus:ring-navy/30 border-light-gray/30"
                    />
                    <span className="ml-2 text-gray-800">Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="authorizedToWork"
                      value="no"
                      checked={formData.workAuthorization.authorizedToWork === false}
                      onChange={(e) => handleInputChange('workAuthorization', {
                        ...formData.workAuthorization,
                        authorizedToWork: false
                      })}
                      className="w-4 h-4 text-navy focus:ring-navy/30 border-light-gray/30"
                    />
                    <span className="ml-2 text-gray-800">No</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-3">Do you require sponsorship for employment visa status?</label>
                <div className="flex space-x-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="requiresVisaSponsorship"
                      value="yes"
                      checked={formData.workAuthorization.requiresVisaSponsorship === true}
                      onChange={(e) => handleInputChange('workAuthorization', {
                        ...formData.workAuthorization,
                        requiresVisaSponsorship: e.target.value === 'yes'
                      })}
                      className="w-4 h-4 text-navy focus:ring-navy/30 border-light-gray/30"
                    />
                    <span className="ml-2 text-gray-800">Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="requiresVisaSponsorship"
                      value="no"
                      checked={formData.workAuthorization.requiresVisaSponsorship === false}
                      onChange={(e) => handleInputChange('workAuthorization', {
                        ...formData.workAuthorization,
                        requiresVisaSponsorship: false
                      })}
                      className="w-4 h-4 text-navy focus:ring-navy/30 border-light-gray/30"
                    />
                    <span className="ml-2 text-gray-800">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Personal & Links */}
          <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-light-gray/30 mb-3 sm:mb-6 md:mb-8">
            <div className="flex items-center mb-4 sm:mb-5 md:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-light-blue/30 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <BookOpen className="text-navy text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-navy">Personal & Links</h3>
                <p className="text-gray-600 text-sm">Tell employers about yourself and share your work</p>
              </div>
              {isPersonalComplete() && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="text-white text-sm" />
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-light-blue/8 border border-light-blue/20 text-gray-800 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy focus:bg-light-blue/12 transition-all duration-200"
                placeholder="Tell employers about yourself, your goals, and what makes you unique..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-light-blue/8 border border-light-blue/20 text-gray-800 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy focus:bg-light-blue/12 transition-all duration-200"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portfolio/Website URL
                </label>
                <input
                  type="url"
                  value={formData.portfolioUrl}
                  onChange={(e) => handleInputChange('portfolioUrl', e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-light-blue/8 border border-light-blue/20 text-gray-800 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy focus:bg-light-blue/12 transition-all duration-200"
                  placeholder="https://yourportfolio.com"
                />
              </div>
            </div>
          </div>

          {/* Profile Picture & Resume */}
          <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-light-gray/30 mb-3 sm:mb-6 md:mb-8">
            <div className="flex items-center mb-4 sm:mb-5 md:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-light-blue/30 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <User className="text-navy text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-navy">Profile Picture & Resume</h3>
                <p className="text-gray-600 text-sm">Upload your photo and resume to stand out</p>
              </div>
              {isFilesComplete() && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="text-white text-sm" />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Profile Picture
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Resume
                </label>
                <FileUpload
                  type="resume"
                  currentFile={formData.resumeUrl}
                  onUploadComplete={(url) => handleInputChange('resumeUrl', url)}
                  onDelete={() => handleInputChange('resumeUrl', '')}
                  userId={user.uid}
                />
              </div>
            </div>
          </div>

          {/* Profile Video */}
          <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-light-gray/30 mb-3 sm:mb-6 md:mb-8">
            <div className="flex items-center mb-4 sm:mb-5 md:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-light-blue/30 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <Video className="text-navy text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-navy">Profile Video</h3>
                <p className="text-gray-600 text-sm">Record a short video to introduce yourself</p>
              </div>
              {isVideoComplete() && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="text-white text-sm" />
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Profile Video (Max 30 seconds)
              </label>
              <VideoUpload
                currentVideo={formData.videoUrl}
                onUploadComplete={(url) => handleInputChange('videoUrl', url)}
                onDelete={() => handleInputChange('videoUrl', '')}
                userId={user.uid}
              />
            </div>
          </div>

          {/* Endorsements */}
          <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-light-gray/30 mb-3 sm:mb-6 md:mb-8">
            <div className="flex items-center mb-4 sm:mb-5 md:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-light-blue/30 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <Award className="text-navy text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-navy">Endorsements</h3>
                <p className="text-gray-600 text-sm">Share your profile to get endorsements</p>
              </div>
              {isEndorsementsComplete() && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="text-white text-sm" />
                </div>
              )}
            </div>
            <div className="text-sm text-gray-700 flex items-center mb-6">
              <Share2 className="h-4 w-4 mr-2" />
              <span className="mr-2">Share link:</span>
              <code className="bg-light-blue/20 px-3 py-2 rounded-lg text-navy font-mono text-sm">
                {typeof window !== 'undefined' ? `${window.location.origin}/endorse/${user.uid}` : `/endorse/${user.uid}`}
              </code>
            </div>
            <p className="text-gray-600 mb-2">Send this link to colleagues, managers or peers so they can vouch for your skills.</p>
            <Link href={`/endorse/${user.uid}`} className="text-blue-600 hover:underline text-sm">Open endorsement form</Link>
          </div>

          {/* Save All Changes */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-light-gray/30 p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl shadow-lg mobile-safe-bottom">
            <div className="w-full md:max-w-7xl md:mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
              <div className="hidden sm:block">
                <h3 className="text-base sm:text-lg font-semibold text-navy">Save All Changes</h3>
                <p className="text-gray-600 text-xs sm:text-sm">Review and save your profile updates</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  className="bg-light-blue/10 text-navy font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl border border-light-blue/40 hover:bg-light-blue/15 transition-all duration-200 min-h-[44px] w-full sm:w-auto text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-navy text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 md:px-8 rounded-xl hover:bg-blue-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[44px] w-full sm:w-auto text-sm sm:text-base"
                >
                  <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">{isSubmitting ? 'Saving...' : 'Save All Changes'}</span>
                  <span className="sm:hidden">{isSubmitting ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
    </div>
  );
}