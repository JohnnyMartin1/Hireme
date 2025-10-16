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
  const { user, profile, loading } = useFirebaseAuth();
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
        
        // Redirect to appropriate dashboard based on role
        // Dashboard will show the updated completion immediately
        if (profile.role === 'JOB_SEEKER') {
          router.push('/home/seeker');
        } else if (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') {
          router.push('/home/employer');
        } else {
          router.push('/home');
        }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => {
              // Navigate to the correct dashboard based on user role
              if (profile?.role === 'JOB_SEEKER') {
                router.push('/home/seeker');
              } else if (profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER') {
                router.push('/home/employer');
              } else {
                router.push('/home');
              }
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-50 text-navy-800 rounded-full hover:bg-blue-100 hover:shadow-sm transition-all duration-200 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="text-gray-600 mt-2">Complete your profile to help employers find you</p>
          
          {/* Real-time Completion Progress */}
          <div className={`mt-6 rounded-xl shadow-lg p-4 transition-all duration-500 ${
            completion === 100 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
              : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <p className="text-sm font-medium text-gray-700">Profile Completion</p>
                {completion === 100 && (
                  <span className="ml-2 text-green-600">✓</span>
                )}
              </div>
              <p className={`text-sm font-semibold ${
                completion === 100 ? 'text-green-600' : 'text-gray-600'
              }`}>
                {completion}% ({Math.floor(completion / 10)}/10 sections)
              </p>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-3 transition-all duration-500 ease-in-out ${
                  completion === 100 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                }`} 
                style={{ width: `${completion}%` }} 
              />
            </div>
            {completion === 100 ? (
              <p className="text-xs text-green-600 mt-2 font-medium flex items-center">
                <span className="mr-2">🎉</span>
                Profile complete! You're ready to be discovered by employers.
              </p>
            ) : completion >= 80 ? (
              <p className="text-xs text-gray-500 mt-2">
                Almost there! Just a few more sections to complete.
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-2">
                Fill out all sections to reach 100%
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Globe className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
              {isBasicInfoComplete() && (
                <Check className="h-5 w-5 ml-2 text-green-600" />
              )}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Professional Headline <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.headline}
                onChange={(e) => handleInputChange('headline', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Computer Science Student | Full-Stack Developer"
              />
            </div>
          </div>

          {/* Education */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <GraduationCap className="h-5 w-5 mr-2 text-green-600" />
                Education
                {isEducationComplete() && (
                  <Check className="h-5 w-5 ml-2 text-green-600" />
                )}
              </h2>
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
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
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
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-purple-600" />
              Location & Work Preferences
              {isLocationComplete() && (
                <Check className="h-5 w-5 ml-2 text-green-600" />
              )}
            </h2>
            
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
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Award className="h-5 w-5 mr-2 text-yellow-600" />
              Skills & Expertise
              {formData.skills && formData.skills.length > 0 && (
                <Check className="h-5 w-5 ml-2 text-green-600" />
              )}
            </h2>
            
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
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Briefcase className="h-5 w-5 mr-2 text-indigo-600" />
              Experience & Activities
              {isExperienceComplete() && (
                <Check className="h-5 w-5 ml-2 text-green-600" />
              )}
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relevant Experience
              </label>
              <textarea
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Briefcase className="h-5 w-5 mr-2 text-indigo-600" />
              Career Interests
              {isCareerInterestsComplete() && (
                <Check className="h-5 w-5 ml-2 text-green-600" />
              )}
            </h2>
            
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
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <HelpCircle className="h-5 w-5 mr-2 text-purple-600" />
              Work Authorization
              {formData.workAuthorization && (formData.workAuthorization.authorizedToWork !== undefined || formData.workAuthorization.requiresVisaSponsorship !== undefined) && (
                <Check className="h-5 w-5 ml-2 text-green-600" />
              )}
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Are you legally authorized to work in the United States?
                </label>
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
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Yes</span>
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
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">No</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Will you now or in the future require visa sponsorship?
                </label>
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
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Yes</span>
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
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Personal & Links */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-red-600" />
              Personal & Links
              {isPersonalComplete() && (
                <Check className="h-5 w-5 ml-2 text-green-600" />
              )}
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://yourportfolio.com"
                />
              </div>
            </div>
          </div>

          {/* Profile Picture & Resume */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <User className="h-5 w-5 mr-2 text-purple-600" />
              Profile Picture & Resume
              {isFilesComplete() && (
                <Check className="h-5 w-5 ml-2 text-green-600" />
              )}
            </h2>
            
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
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Video className="h-5 w-5 mr-2 text-orange-600" />
              Profile Video
              {isVideoComplete() && (
                <Check className="h-5 w-5 ml-2 text-green-600" />
              )}
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Profile Video (Max 1 minute)
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
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Award className="h-5 w-5 mr-2 text-yellow-600" />
                Endorsements
              </h2>
              <div className="text-sm text-gray-700 flex items-center">
                <Share2 className="h-4 w-4 mr-2" />
                <span className="mr-2">Share link:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {typeof window !== 'undefined' ? `${window.location.origin}/endorse/${user.uid}` : `/endorse/${user.uid}`}
                </code>
              </div>
            </div>
            <p className="text-gray-600 mb-2">Send this link to colleagues, managers or peers so they can vouch for your skills.</p>
            <Link href={`/endorse/${user.uid}`} className="text-blue-600 hover:underline text-sm">Open endorsement form</Link>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              <Save className="h-5 w-5 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}