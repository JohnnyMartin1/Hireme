'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/lib/firebase-auth';
import { createDocument, updateDocument } from '@/lib/firebase-firestore';
import { FileUpload } from '@/components/FileUpload';
import { VideoUpload } from '@/components/VideoUpload';

interface ProfileData {
  workLocations: string[];
  workArrangements: string;
  jobTypes: string[];
  skills: string[];
  experience: string;
  industries: string[];
  linkedin: string;
  portfolio: string;
  avatar: File | null;
  resume: File | null;
  video: File | null;
}

const slideContents = [
  {
    title: 'Work Preferences',
    description: 'Tell us where and how you prefer to work'
  },
  {
    title: 'Skills & Expertise',
    description: 'Showcase your technical and professional abilities'
  },
  {
    title: 'Experience',
    description: 'Share your relevant work experience and achievements'
  },
  {
    title: 'Career Industries',
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
    description: 'Record a brief introduction (optional)'
  },
  {
    title: 'Review & Submit',
    description: 'Review your information and complete your profile'
  }
];

const workLocations = [
  'New York, NY', 'San Francisco, CA', 'Austin, TX', 'Seattle, WA', 'Chicago, IL',
  'Boston, MA', 'Los Angeles, CA', 'Denver, CO', 'Miami, FL', 'Atlanta, GA'
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
  const { user } = useFirebaseAuth();
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileData, setProfileData] = useState<ProfileData>({
    workLocations: [],
    workArrangements: '',
    jobTypes: [],
    skills: [],
    experience: '',
    industries: [],
    linkedin: '',
    portfolio: '',
    avatar: null,
    resume: null,
    video: null
  });

  const totalSlides = 8;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Redirect if user is already onboarded
  useEffect(() => {
    if (user && user.onboardingComplete) {
      router.push('/home/seeker');
    }
  }, [user, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMultiSelect = (type: keyof ProfileData, value: string) => {
    const currentArray = profileData[type] as string[];
    if (currentArray.includes(value)) {
      setProfileData({
        ...profileData,
        [type]: currentArray.filter(item => item !== value)
      });
    } else {
      setProfileData({
        ...profileData,
        [type]: [...currentArray, value]
      });
    }
  };

  const removeItem = (type: keyof ProfileData, value: string) => {
    const currentArray = profileData[type] as string[];
    setProfileData({
      ...profileData,
      [type]: currentArray.filter(item => item !== value)
    });
  };

  const getFilteredOptions = (options: string[]) => {
    return options.filter(option => 
      option.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

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

  const nextSlide = () => {
    if (currentSlide < totalSlides) {
      if (validateCurrentSlide()) {
        setCurrentSlide(currentSlide + 1);
      }
    } else {
      submitProfile();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(currentSlide - 1);
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
        workLocations: profileData.workLocations,
        workArrangements: profileData.workArrangements,
        jobTypes: profileData.jobTypes,
        skills: profileData.skills,
        experience: profileData.experience,
        industries: profileData.industries,
        linkedinUrl: profileData.linkedin,
        portfolioUrl: profileData.portfolio,
        onboardingComplete: true,
        profileComplete: true
      };

      if (user?.uid) {
        await updateDocument('profiles', user.uid, profileUpdate);
        
        // Handle file uploads if present
        if (profileData.avatar) {
          // Upload avatar logic
        }
        if (profileData.resume) {
          // Upload resume logic
        }
        if (profileData.video) {
          // Upload video logic
        }
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
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const isValidLinkedInUrl = (string: string) => {
    return isValidUrl(string) && string.includes('linkedin.com');
  };

  const currentContent = updateSlideContent();
  const progressPercentage = updateProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative">
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-blue-100/30 pointer-events-none"></div>
      
      <main className="relative z-10 min-h-screen">
        {/* Top Bar */}
        <header className="px-6 py-4">
          <button 
            onClick={() => router.push('/home/seeker')}
            className="flex items-center text-navy hover:text-opacity-80 transition-colors font-medium"
          >
            <i className="fa-solid fa-arrow-left mr-2"></i>
            Back to Dashboard
          </button>
        </header>

        {/* Header Stack */}
        <div className="text-center px-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{currentContent.title}</h1>
          <p className="text-lg text-gray-600 mb-8">{currentContent.description}</p>
          
          {/* Progress Module */}
          <div className="max-w-md mx-auto bg-white rounded-2xl p-6 shadow-sm border border-gray-200/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">Progress</span>
              <span className="text-sm font-semibold text-navy">Step {currentSlide} of {totalSlides}</span>
            </div>
            <div className="w-full bg-gray-200/40 rounded-full h-2">
              <div 
                className="bg-navy h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Stage Area */}
        <div className="max-w-4xl mx-auto px-6 pb-32">
          <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/60">
            
            {/* Slide 1: Work Preferences */}
            {currentSlide === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Work Locations */}
                <div className="lg:col-span-2 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Work Locations
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <input
                      type="text"
                      placeholder=" "
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown('locations');
                      }}
                      onFocus={() => setShowDropdown('locations')}
                      className="w-full h-12 bg-blue-50/50 rounded-xl border border-gray-200 px-4 pt-6 pb-2 focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition-all"
                    />
                    <label className="absolute left-4 top-4 text-gray-500 text-sm pointer-events-none">
                      Preferred Work Locations
                    </label>
                    
                    {showDropdown === 'locations' && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-20 max-h-48 overflow-y-auto">
                        <div className="p-2">
                          {getFilteredOptions(workLocations).map((location) => (
                            <div
                              key={location}
                              onClick={() => {
                                handleMultiSelect('workLocations', location);
                                setSearchQuery('');
                              }}
                              className="px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center justify-between"
                            >
                              <span>{location}</span>
                              {profileData.workLocations.includes(location) && (
                                <i className="fa-solid fa-check text-navy"></i>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {profileData.workLocations.map((location, index) => (
                        <span key={index} className="bg-navy/10 text-navy px-3 py-1 rounded-full text-sm flex items-center space-x-2">
                          <span>{location}</span>
                          <button
                            onClick={() => removeItem('workLocations', location)}
                            className="text-navy/60 hover:text-navy"
                          >
                            <i className="fa-solid fa-times text-xs"></i>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Work Arrangements */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Arrangements
                  </label>
                  <select
                    value={profileData.workArrangements}
                    onChange={(e) => setProfileData({...profileData, workArrangements: e.target.value})}
                    className="w-full h-12 bg-blue-50/50 rounded-xl border border-gray-200 px-4 pt-6 pb-2 focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition-all appearance-none"
                  >
                    <option value="" disabled></option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site</option>
                  </select>
                  <label className="absolute left-4 top-4 text-gray-500 text-sm pointer-events-none">
                    Work Arrangements
                  </label>
                  <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"></i>
                </div>

                {/* Job Types */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Types
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <input
                      type="text"
                      placeholder=" "
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown('jobTypes');
                      }}
                      onFocus={() => setShowDropdown('jobTypes')}
                      className="w-full h-12 bg-blue-50/50 rounded-xl border border-gray-200 px-4 pt-6 pb-2 focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition-all"
                    />
                    <label className="absolute left-4 top-4 text-gray-500 text-sm pointer-events-none">
                      Job Types
                    </label>
                    
                    {showDropdown === 'jobTypes' && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-20 max-h-48 overflow-y-auto">
                        <div className="p-2">
                          {getFilteredOptions(jobTypes).map((type) => (
                            <div
                              key={type}
                              onClick={() => {
                                handleMultiSelect('jobTypes', type);
                                setSearchQuery('');
                              }}
                              className="px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center justify-between"
                            >
                              <span>{type}</span>
                              {profileData.jobTypes.includes(type) && (
                                <i className="fa-solid fa-check text-navy"></i>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {profileData.jobTypes.map((type, index) => (
                        <span key={index} className="bg-navy/10 text-navy px-3 py-1 rounded-full text-sm flex items-center space-x-2">
                          <span>{type}</span>
                          <button
                            onClick={() => removeItem('jobTypes', type)}
                            className="text-navy/60 hover:text-navy"
                          >
                            <i className="fa-solid fa-times text-xs"></i>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Slide 2: Skills & Expertise */}
            {currentSlide === 2 && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technical & Professional Skills
                </label>
                <div className="relative" ref={dropdownRef}>
                  <input
                    type="text"
                    placeholder=" "
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown('skills');
                    }}
                    onFocus={() => setShowDropdown('skills')}
                    className="w-full h-12 bg-blue-50/50 rounded-xl border border-gray-200 px-4 pt-6 pb-2 focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition-all"
                  />
                  <label className="absolute left-4 top-4 text-gray-500 text-sm pointer-events-none">
                    Technical & Professional Skills
                  </label>
                  
                  {showDropdown === 'skills' && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-20 max-h-48 overflow-y-auto">
                      <div className="p-2">
                        {getFilteredOptions(skills).map((skill) => (
                          <div
                            key={skill}
                            onClick={() => {
                              handleMultiSelect('skills', skill);
                              setSearchQuery('');
                            }}
                            className="px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center justify-between"
                          >
                            <span>{skill}</span>
                            {profileData.skills.includes(skill) && (
                              <i className="fa-solid fa-check text-navy"></i>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    {profileData.skills.map((skill, index) => (
                      <span key={index} className="bg-navy/10 text-navy px-3 py-1 rounded-full text-sm flex items-center space-x-2">
                        <span>{skill}</span>
                        <button
                          onClick={() => removeItem('skills', skill)}
                          className="text-navy/60 hover:text-navy"
                        >
                          <i className="fa-solid fa-times text-xs"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Slide 3: Experience */}
            {currentSlide === 3 && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experience & Relevant Experience
                </label>
                <textarea
                  value={profileData.experience}
                  onChange={(e) => setProfileData({...profileData, experience: e.target.value})}
                  rows={6}
                  placeholder=" "
                  className="w-full bg-blue-50/50 rounded-xl border border-gray-200 px-4 pt-6 pb-2 focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition-all resize-none"
                />
                <label className="absolute left-4 top-4 text-gray-500 text-sm pointer-events-none">
                  Experience & Relevant Experience
                </label>
                <div className="flex justify-end mt-2">
                  <span className="text-sm text-gray-500">
                    {profileData.experience.split(/\s+/).filter(word => word.length > 0).length} words
                  </span>
                </div>
              </div>
            )}

            {/* Slide 4: Industries */}
            {currentSlide === 4 && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Career Industries
                </label>
                <div className="relative" ref={dropdownRef}>
                  <input
                    type="text"
                    placeholder=" "
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown('industries');
                    }}
                    onFocus={() => setShowDropdown('industries')}
                    className="w-full h-12 bg-blue-50/50 rounded-xl border border-gray-200 px-4 pt-6 pb-2 focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition-all"
                  />
                  <label className="absolute left-4 top-4 text-gray-500 text-sm pointer-events-none">
                    Career Industries
                  </label>
                  
                  {showDropdown === 'industries' && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-20 max-h-48 overflow-y-auto">
                      <div className="p-2">
                        {getFilteredOptions(industries).map((industry) => (
                          <div
                            key={industry}
                            onClick={() => {
                              handleMultiSelect('industries', industry);
                              setSearchQuery('');
                            }}
                            className="px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center justify-between"
                          >
                            <span>{industry}</span>
                            {profileData.industries.includes(industry) && (
                              <i className="fa-solid fa-check text-navy"></i>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    {profileData.industries.map((industry, index) => (
                      <span key={index} className="bg-navy/10 text-navy px-3 py-1 rounded-full text-sm flex items-center space-x-2">
                        <span>{industry}</span>
                        <button
                          onClick={() => removeItem('industries', industry)}
                          className="text-navy/60 hover:text-navy"
                        >
                          <i className="fa-solid fa-times text-xs"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
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
                    placeholder=" "
                    className="w-full h-12 bg-blue-50/50 rounded-xl border border-gray-200 px-4 pt-6 pb-2 focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition-all"
                  />
                  <label className="absolute left-4 top-4 text-gray-500 text-sm pointer-events-none">
                    LinkedIn URL
                  </label>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Portfolio/Website URL
                  </label>
                  <input
                    type="url"
                    value={profileData.portfolio}
                    onChange={(e) => setProfileData({...profileData, portfolio: e.target.value})}
                    placeholder=" "
                    className="w-full h-12 bg-blue-50/50 rounded-xl border border-gray-200 px-4 pt-6 pb-2 focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition-all"
                  />
                  <label className="absolute left-4 top-4 text-gray-500 text-sm pointer-events-none">
                    Portfolio/Website URL
                  </label>
                </div>
              </div>
            )}

            {/* Slide 6: Profile Assets */}
            {currentSlide === 6 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Profile Picture</label>
                  <FileUpload
                    type="profile"
                    currentFile=""
                    onUploadComplete={(url) => console.log('Avatar uploaded:', url)}
                    onDelete={() => console.log('Avatar deleted')}
                    userId={user?.uid || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Resume</label>
                  <FileUpload
                    type="resume"
                    currentFile=""
                    onUploadComplete={(url) => console.log('Resume uploaded:', url)}
                    onDelete={() => console.log('Resume deleted')}
                    userId={user?.uid || ''}
                  />
                </div>
              </div>
            )}

            {/* Slide 7: Bio Video */}
            {currentSlide === 7 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Bio Video (Optional)</label>
                <VideoUpload
                  currentVideo=""
                  onUploadComplete={(url) => console.log('Video uploaded:', url)}
                  onDelete={() => console.log('Video deleted')}
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
                        className="text-navy text-sm hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><span className="font-medium">Locations:</span> {profileData.workLocations.length > 0 ? profileData.workLocations.join(', ') : 'Not specified'}</p>
                      <p><span className="font-medium">Arrangements:</span> {profileData.workArrangements || 'Not specified'}</p>
                      <p><span className="font-medium">Job Types:</span> {profileData.jobTypes.length > 0 ? profileData.jobTypes.join(', ') : 'Not specified'}</p>
                    </div>
                  </div>

                  {/* Skills Summary */}
                  <div className="bg-white/60 rounded-xl p-6 border border-gray-200/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Skills</h3>
                      <button 
                        onClick={() => setCurrentSlide(2)}
                        className="text-navy text-sm hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      {profileData.skills.length > 0 ? profileData.skills.join(', ') : 'Not specified'}
                    </div>
                  </div>

                  {/* Experience Summary */}
                  <div className="bg-white/60 rounded-xl p-6 border border-gray-200/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Experience</h3>
                      <button 
                        onClick={() => setCurrentSlide(3)}
                        className="text-navy text-sm hover:underline"
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
                      <h3 className="font-semibold text-gray-900">Industries</h3>
                      <button 
                        onClick={() => setCurrentSlide(4)}
                        className="text-navy text-sm hover:underline"
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
                        className="text-navy text-sm hover:underline"
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
                        className="text-navy text-sm hover:underline"
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
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex items-center space-x-4 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/60">
            <button 
              onClick={prevSlide}
              disabled={currentSlide === 1}
              className="flex items-center px-6 py-3 text-navy border border-navy rounded-xl font-medium transition-all hover:bg-navy/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="fa-solid fa-chevron-left mr-2"></i>
              Back
            </button>
            <button 
              onClick={nextSlide}
              disabled={isSubmitting}
              className="px-8 py-3 bg-navy text-white rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin mr-2"></i>
                  Submitting...
                </>
              ) : (
                currentSlide === totalSlides ? 'Submit Profile' : 'Next'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
