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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-colors group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 269 274" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M111.028 0C172.347 0.000238791 222.055 51.647 222.055 115.356C222.055 140.617 214.238 163.98 200.983 182.981L258.517 242.758L238.036 264.036L181.077 204.857C161.97 221.02 137.589 230.713 111.028 230.713C49.7092 230.713 2.76862e-05 179.066 0 115.356C0 51.6468 49.7092 0 111.028 0Z" fill="white"/>
                <path d="M205.69 115.392C205.69 170.42 163.308 215.029 111.028 215.029C58.748 215.029 16.3666 170.42 16.3666 115.392C16.3666 60.3646 58.748 15.7559 111.028 15.7559C163.308 15.7559 205.69 60.3646 205.69 115.392Z" fill="#4F86F7"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-navy-900">HireMe</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 tracking-tight">Edit Profile</h1>
          <p className="text-slate-600 mt-2 text-lg">Complete your profile to increase visibility and connect with top employers.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Profile Completion */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sticky top-24">
              <h2 className="text-lg font-bold text-navy-900 mb-4">Profile Completion</h2>
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                    <circle cx="50" cy="50" r="45" stroke="url(#gradient)" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={`${completion * 2.83} 283`} />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#1e3a5f" />
                        <stop offset="100%" stopColor="#0ea5e9" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-navy-900">{completion}%</span>
                  </div>
                </div>
              </div>
              <p className="text-slate-600 text-sm text-center">{Math.floor(completion / 10)} of 10 sections completed</p>
            </div>
          </div>

          {/* Main Form Area */}
          <div className="lg:col-span-3">

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <User className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Basic Information</h3>
                <p className="text-slate-600 text-sm">Your core personal details</p>
              </div>
              {isBasicInfoComplete() && (
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full h-12 px-4 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
                  placeholder="John"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full h-12 px-4 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-900 mb-2">Professional Headline</label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => handleInputChange('headline', e.target.value)}
                className="w-full h-12 px-4 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
                placeholder="e.g., Computer Science Student | Full-Stack Developer"
              />
            </div>
          </div>

          {/* Education */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <GraduationCap className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Education</h3>
                <p className="text-slate-600 text-sm">Your academic background and achievements</p>
              </div>
              {isEducationComplete() && (
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
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
                className="px-5 py-2.5 bg-navy-800 text-white text-sm font-semibold rounded-lg hover:bg-navy-700 transition-colors shadow-sm"
              >
                Add Education
              </button>
            </div>
            
            {formData.education.map((edu, index) => (
              <div key={index} className="border border-slate-200 rounded-xl p-6 mb-4 bg-slate-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-navy-900">Education {index + 1}</h3>
                  {formData.education.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newEducation = formData.education.filter((_, i) => i !== index);
                        handleInputChange('education', newEducation);
                      }}
                      className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
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
                <h3 className="text-xl font-bold text-navy-900">Skills & Expertise</h3>
                <p className="text-slate-600 text-sm">Technical and professional skills (up to 20)</p>
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
          </div>

          {/* Experience & Activities */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Briefcase className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Experience & Activities</h3>
                <p className="text-slate-600 text-sm">Your professional and academic experiences</p>
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
              <label className="block text-sm font-medium text-navy-900 mb-2">Relevant Experience</label>
              <textarea
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all resize-none"
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
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Briefcase className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Career Interests</h3>
                <p className="text-slate-600 text-sm">Industries and roles you're interested in (up to 5)</p>
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
                label="Career Industries"
                allowCustom
                maxSelections={5}
              />
              <p className="text-sm text-slate-500 mt-2">
                Select up to 5 industries you're most interested in pursuing for your career.
              </p>
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

          {/* Personal & Links */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <BookOpen className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Personal & Links</h3>
                <p className="text-slate-600 text-sm">Tell employers about yourself and share your work</p>
              </div>
              {isPersonalComplete() && (
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-navy-900 mb-2">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all resize-none"
                placeholder="Tell employers about yourself, your goals, and what makes you unique..."
              />
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
          </div>

          {/* Profile Video */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Video className="h-6 w-6 text-navy-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy-900">Profile Video</h3>
                <p className="text-slate-600 text-sm">Record a short video to introduce yourself</p>
              </div>
              {isVideoComplete() && (
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-navy-900 mb-4">Profile Video (Max 30 seconds)</label>
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