'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { createDocument, updateDocument } from '@/lib/firebase-firestore';
import FileUpload from '@/components/FileUpload';
import VideoUpload from '@/components/VideoUpload';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import LanguageSelector, { LanguageSkill } from '@/components/LanguageSelector';
import { LOCATIONS, WORK_PREFERENCES, JOB_TYPES, SKILLS, CAREER_INTERESTS, LANGUAGES } from '@/lib/profile-data';

interface ProfileData {
  workLocations: string[];
  workArrangements: string[];
  jobTypes: string[];
  skills: string[];
  languages: LanguageSkill[];
  experience: string;
  industries: string[];
  linkedin: string;
  portfolio: string;
  avatar: string;
  resume: string;
  video: string;
}

const slideContents = [
  {
    title: 'Work Preferences',
    description: 'Tell us where and how you prefer to work'
  },
  {
    title: 'Skills & Languages',
    description: 'Showcase your technical and professional abilities'
  },
  {
    title: 'Extracurricular Activities',
    description: 'Help employers learn more about you by including any experiences that make you stand out!'
  },
  {
    title: 'Career Interests',
    description: 'Select the industries you\'re interested in'
  },
  {
    title: 'Personal Links',
    description: 'Add your professional online presence'
  },
  {
    title: 'Profile Assets',
    description: 'Upload your profile picture and resume'
  },
  {
    title: 'Bio Video',
    description: 'Stand out with a personal introduction (highly recommended)'
  },
  {
    title: 'Review & Submit',
    description: 'Review your information and complete your profile'
  }
];

const jobTypes = [
  'Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance', 'Temporary'
];

const skills = [
  'JavaScript', 'Python', 'React', 'Node.js', 'Project Management', 'Data Analysis',
  'Java', 'C++', 'SQL', 'Machine Learning', 'UI/UX Design', 'Marketing'
];

const industries = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Marketing', 'Retail',
  'Manufacturing', 'Consulting', 'Non-profit', 'Government'
];

export default function NextStepsOnboarding() {
  const router = useRouter();
  const { user, profile, loading } = useFirebaseAuth();
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    workLocations: [],
    workArrangements: [],
    jobTypes: [],
    skills: [],
    languages: [],
    experience: '',
    industries: [],
    linkedin: '',
    portfolio: '',
    avatar: '',
    resume: '',
    video: ''
  });

  const totalSlides = 8;

  // Redirect if user is not authenticated or already onboarded
  useEffect(() => {
    if (!loading) {
      if (!user) {
        // User not authenticated, redirect to signup
        router.push('/auth/signup/seeker');
        return;
      }
      if (user && profile?.onboardingComplete) {
        router.push('/home/seeker');
      }
    }
  }, [user, profile, loading, router]);

  const updateSlideContent = () => {
    const content = slideContents[currentSlide - 1];
    return content;
  };

  const updateProgress = () => {
    return (currentSlide / totalSlides) * 100;
  };

  const showCoachmark = (slideNumber: number) => {
    // Coachmark logic would be implemented here
    return slideNumber;
  };

  const saveCurrentSlideData = async () => {
    if (!user?.uid) return;
    
    try {
      // Save current slide data to user profile
      const currentData = {
        locations: profileData.workLocations,
        workPreferences: profileData.workArrangements,
        jobTypes: profileData.jobTypes,
        skills: profileData.skills,
        languages: profileData.languages,
        experience: profileData.experience,
        careerInterests: profileData.industries,
        linkedinUrl: profileData.linkedin ? normalizeLinkedInUrl(profileData.linkedin) : '',
        portfolioUrl: profileData.portfolio,
        profileImageUrl: profileData.avatar,
        resumeUrl: profileData.resume,
        videoUrl: profileData.video,
      };
      
      await updateDocument('users', user.uid, currentData);
    } catch (error) {
      console.error('Error saving slide data:', error);
    }
  };

  const nextSlide = async () => {
    if (currentSlide < totalSlides) {
      if (validateCurrentSlide()) {
        // Save current slide data before moving to next slide
        await saveCurrentSlideData();
        setCurrentSlide(currentSlide + 1);
        // Scroll to top on mobile
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } else {
      submitProfile();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(currentSlide - 1);
      // Scroll to top on mobile
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const validateCurrentSlide = () => {
    switch (currentSlide) {
      case 5: // Personal Links
        if (profileData.linkedin && !isValidLinkedInUrl(profileData.linkedin)) {
          return false;
        }
        if (profileData.portfolio && !isValidUrl(profileData.portfolio)) {
          return false;
        }
        break;
    }
    return true;
  };

  const submitProfile = async () => {
    setIsSubmitting(true);
    
    try {
      // Create or update profile with the collected data
      const profileUpdate = {
        locations: profileData.workLocations,
        workPreferences: profileData.workArrangements,
        jobTypes: profileData.jobTypes,
        skills: profileData.skills,
        languages: profileData.languages,
        experience: profileData.experience,
        careerInterests: profileData.industries,
        linkedinUrl: profileData.linkedin ? normalizeLinkedInUrl(profileData.linkedin) : '',
        portfolioUrl: profileData.portfolio,
        profileImageUrl: profileData.avatar,
        resumeUrl: profileData.resume,
        videoUrl: profileData.video,
        onboardingComplete: true,
        profileComplete: true
      };

      if (user?.uid) {
        await updateDocument('users', user.uid, profileUpdate);
      }

      // Redirect to dashboard
      router.push('/home/seeker');
    } catch (error) {
      console.error('Error submitting profile:', error);
      setIsSubmitting(false);
    }
  };

  const isValidUrl = (string: string) => {
    try {
      // If the string doesn't start with http:// or https://, add https://
      const urlToTest = string.startsWith('http://') || string.startsWith('https://') 
        ? string 
        : `https://${string}`;
      new URL(urlToTest);
      return true;
    } catch (_) {
      return false;
    }
  };

  const normalizeLinkedInUrl = (url: string): string => {
    if (!url || !url.trim()) return url;
    
    let normalized = url.trim();
    
    // Remove trailing slash if present
    normalized = normalized.replace(/\/$/, '');
    
    // Add https:// if no protocol is present
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }
    
    return normalized;
  };

  const isValidLinkedInUrl = (string: string) => {
    if (!string || !string.trim()) return true; // Empty is valid (optional field)
    
    // Normalize the URL for validation
    const normalized = normalizeLinkedInUrl(string);
    
    // Check if it's a valid URL and contains linkedin.com
    return isValidUrl(normalized) && normalized.includes('linkedin.com');
  };

  const currentContent = updateSlideContent();
  const progressPercentage = updateProgress();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show redirecting message if user is not authenticated (will redirect)
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to signup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative mobile-safe-top mobile-safe-bottom">
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-blue-100/30 pointer-events-none"></div>
      
      <main className="relative z-10 min-h-screen">
        {/* Top Bar */}
        <header className="px-4 sm:px-6 py-4">
          {/* Empty header for spacing */}
        </header>

        {/* Header Stack */}
        <div className="text-center px-4 sm:px-6 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{currentContent.title}</h1>
          <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">{currentContent.description}</p>
          
          {/* Progress Module */}
          <div className="max-w-md mx-auto bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">Progress</span>
              <span className="text-sm font-semibold text-navy">Step {currentSlide} of {totalSlides}</span>
            </div>
            <div className="w-full bg-gray-200/40 rounded-full h-2">
              <div 
                className="bg-navy-800 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Stage Area */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 sm:pb-32">
          <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-4 sm:p-8 shadow-lg border border-white/60">
            
            {/* Slide 1: Work Preferences */}
            {currentSlide === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {/* Work Locations */}
                <div className="lg:col-span-2">
                  <MultiSelectDropdown
                    options={LOCATIONS}
                    values={profileData.workLocations}
                    onChange={(values) => setProfileData({...profileData, workLocations: values})}
                    placeholder="Select preferred work locations"
                    label="Preferred Work Locations"
                    allowCustom
                    maxSelections={5}
                  />
                </div>

                {/* Work Arrangements */}
                <div>
                  <MultiSelectDropdown
                    options={WORK_PREFERENCES}
                    values={profileData.workArrangements}
                    onChange={(values) => setProfileData({...profileData, workArrangements: values})}
                    placeholder="Select work arrangements"
                    label="Work Arrangements"
                    allowCustom
                    maxSelections={5}
                  />
                </div>

                {/* Job Types */}
                <div>
                  <MultiSelectDropdown
                    options={JOB_TYPES}
                    values={profileData.jobTypes}
                    onChange={(values) => setProfileData({...profileData, jobTypes: values})}
                    placeholder="Select job types"
                    label="Job Types"
                    allowCustom
                    maxSelections={5}
                  />
                </div>
              </div>
            )}

            {/* Slide 2: Skills & Languages */}
            {currentSlide === 2 && (
              <div className="space-y-6">
                <div>
                  <MultiSelectDropdown
                    options={SKILLS}
                    values={profileData.skills}
                    onChange={(values) => setProfileData({...profileData, skills: values})}
                    placeholder="Select your skills"
                    label="Technical & Professional Skills"
                    allowCustom
                    maxSelections={10}
                  />
                </div>
                <div>
                  <LanguageSelector
                    options={LANGUAGES}
                    values={profileData.languages}
                    onChange={(values) => setProfileData({...profileData, languages: values})}
                    placeholder="Select languages you speak"
                    label="Languages"
                    allowCustom
                    maxSelections={10}
                  />
                </div>
              </div>
            )}

            {/* Slide 3: Extracurricular Activities */}
            {currentSlide === 3 && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extracurricular Activities
                </label>
                <textarea
                  value={profileData.experience}
                  onChange={(e) => setProfileData({...profileData, experience: e.target.value})}
                  rows={6}
                  placeholder="Describe your extracurricular activities, clubs, volunteer work, projects, etc."
                  className="w-full bg-blue-50/50 rounded-xl border border-gray-200 px-4 py-4 focus:border-navy-800 focus:ring-2 focus:ring-navy/20 focus:outline-none transition-all resize-none"
                />
                <div className="flex justify-end mt-2">
                  <span className="text-sm text-gray-500">
                    {profileData.experience.split(/\s+/).filter(word => word.length > 0).length} words
                  </span>
                </div>
              </div>
            )}

            {/* Slide 4: Career Interests */}
            {currentSlide === 4 && (
              <div>
                <MultiSelectDropdown
                  options={CAREER_INTERESTS}
                  values={profileData.industries}
                  onChange={(values) => setProfileData({...profileData, industries: values})}
                  placeholder="Select industries"
                  label="Career Interests"
                  allowCustom
                  maxSelections={5}
                />
              </div>
            )}

            {/* Slide 5: Personal Links */}
            {currentSlide === 5 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={profileData.linkedin}
                    onChange={(e) => setProfileData({...profileData, linkedin: e.target.value})}
                    onBlur={(e) => {
                      // Normalize the URL when user leaves the field
                      if (e.target.value.trim()) {
                        const normalized = normalizeLinkedInUrl(e.target.value);
                        setProfileData({...profileData, linkedin: normalized});
                      }
                    }}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full h-12 bg-blue-50/50 rounded-xl border border-gray-200 px-4 py-4 focus:border-navy-800 focus:ring-2 focus:ring-navy/20 focus:outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Portfolio/Website URL
                  </label>
                  <input
                    type="url"
                    value={profileData.portfolio}
                    onChange={(e) => setProfileData({...profileData, portfolio: e.target.value})}
                    placeholder="https://yourportfolio.com"
                    className="w-full h-12 bg-blue-50/50 rounded-xl border border-gray-200 px-4 py-4 focus:border-navy-800 focus:ring-2 focus:ring-navy/20 focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Slide 6: Profile Assets */}
            {currentSlide === 6 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Profile Picture</label>
                  <FileUpload
                    type="profile-image"
                    currentFile={profileData.avatar || ''}
                    onUploadComplete={(url) => setProfileData({...profileData, avatar: url})}
                    onDelete={() => setProfileData({...profileData, avatar: ''})}
                    userId={user?.uid || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Resume</label>
                  <FileUpload
                    type="resume"
                    currentFile={profileData.resume || ''}
                    onUploadComplete={(url) => setProfileData({...profileData, resume: url})}
                    onDelete={() => setProfileData({...profileData, resume: ''})}
                    userId={user?.uid || ''}
                  />
                </div>
              </div>
            )}

            {/* Slide 7: Bio Video */}
            {currentSlide === 7 && (
              <div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio Video <span className="text-navy-800 font-semibold">(Optional but Highly Recommended)</span>
                  </label>
                  <div className="bg-gradient-to-br from-sky-50 to-blue-50 border-2 border-sky-200 rounded-xl p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center">
                        <i className="fa-solid fa-video text-white text-sm"></i>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">Why add a video?</h4>
                        <p className="text-sm text-gray-700 mb-3">
                          Your resume tells employers what you've done, but a video shows them <span className="font-semibold">who you are</span>. 
                          Employers can see your personality, communication skills, and enthusiasm—things that don't come through on paper.
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold text-sky-700">Candidates with intro videos receive significantly more messages from employers</span> and have much better hiring outcomes. 
                          Take just a minute to introduce yourself and stand out from the crowd!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <VideoUpload
                  currentVideo={profileData.video || ''}
                  onUploadComplete={(url) => setProfileData({...profileData, video: url})}
                  onDelete={() => setProfileData({...profileData, video: ''})}
                  userId={user?.uid || ''}
                />
              </div>
            )}

            {/* Slide 8: Review & Submit */}
            {currentSlide === 8 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Profile</h2>
                  <p className="text-gray-600">Make sure everything looks great before submitting</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Work Preferences Summary */}
                  <div className="bg-white/60 rounded-xl p-6 border border-gray-200/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Work Preferences</h3>
                      <button 
                        onClick={() => setCurrentSlide(1)}
                        className="text-navy-800 text-sm hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><span className="font-medium">Locations:</span> {profileData.workLocations.length > 0 ? profileData.workLocations.join(', ') : 'Not specified'}</p>
                      <p><span className="font-medium">Arrangements:</span> {profileData.workArrangements.length > 0 ? profileData.workArrangements.join(', ') : 'Not specified'}</p>
                      <p><span className="font-medium">Job Types:</span> {profileData.jobTypes.length > 0 ? profileData.jobTypes.join(', ') : 'Not specified'}</p>
                    </div>
                  </div>

                  {/* Skills Summary */}
                  <div className="bg-white/60 rounded-xl p-6 border border-gray-200/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Skills & Languages</h3>
                      <button 
                        onClick={() => setCurrentSlide(2)}
                        className="text-navy-800 text-sm hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><span className="font-medium">Technical & Professional Skills:</span> {profileData.skills.length > 0 ? profileData.skills.join(', ') : 'Not specified'}</p>
                      <p><span className="font-medium">Languages:</span> {profileData.languages.length > 0 ? profileData.languages.map(l => l.language).join(', ') : 'Not specified'}</p>
                    </div>
                  </div>

                  {/* Experience Summary */}
                  <div className="bg-white/60 rounded-xl p-6 border border-gray-200/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Extracurricular Activities</h3>
                      <button 
                        onClick={() => setCurrentSlide(3)}
                        className="text-navy-800 text-sm hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      {profileData.experience || 'Not specified'}
                    </div>
                  </div>

                  {/* Industries Summary */}
                  <div className="bg-white/60 rounded-xl p-6 border border-gray-200/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Career Interests</h3>
                      <button 
                        onClick={() => setCurrentSlide(4)}
                        className="text-navy-800 text-sm hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      {profileData.industries.length > 0 ? profileData.industries.join(', ') : 'Not specified'}
                    </div>
                  </div>

                  {/* Links Summary */}
                  <div className="bg-white/60 rounded-xl p-6 border border-gray-200/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Links</h3>
                      <button 
                        onClick={() => setCurrentSlide(5)}
                        className="text-navy-800 text-sm hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><span className="font-medium">LinkedIn:</span> {profileData.linkedin || 'Not provided'}</p>
                      <p><span className="font-medium">Portfolio:</span> {profileData.portfolio || 'Not provided'}</p>
                    </div>
                  </div>

                  {/* Uploads Summary */}
                  <div className="bg-white/60 rounded-xl p-6 border border-gray-200/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Uploads</h3>
                      <button 
                        onClick={() => setCurrentSlide(6)}
                        className="text-navy-800 text-sm hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><span className="font-medium">Profile Picture:</span> {profileData.avatar ? 'Uploaded' : 'Not uploaded'}</p>
                      <p><span className="font-medium">Resume:</span> {profileData.resume ? 'Uploaded' : 'Not uploaded'}</p>
                      <p><span className="font-medium">Bio Video:</span> {profileData.video ? 'Uploaded' : 'Not uploaded'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pinned Footer Controls */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-200/30 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between space-x-4">
              <button 
                onClick={prevSlide}
                disabled={currentSlide === 1}
                className="flex items-center justify-center px-6 py-3 text-navy-800 border-2 border-navy-800 rounded-xl font-semibold transition-all hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px] min-w-[100px]"
              >
                <i className="fa-solid fa-chevron-left mr-2"></i>
                <span>Back</span>
              </button>
              <button 
                onClick={nextSlide}
                disabled={isSubmitting}
                className="flex items-center justify-center px-8 py-3 bg-navy-800 text-white rounded-xl font-semibold transition-all hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px] min-w-[120px] shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin mr-2"></i>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>{currentSlide === totalSlides ? 'Submit Profile' : 'Next'}</span>
                    {currentSlide !== totalSlides && <i className="fa-solid fa-chevron-right ml-2"></i>}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
