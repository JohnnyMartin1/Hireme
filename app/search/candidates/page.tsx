"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { Search, User, MapPin, GraduationCap, Star, Loader2, Filter, X, MessageSquare, ArrowLeft } from "lucide-react";
import { getProfilesByRole } from '@/lib/firebase-firestore';
import SearchableDropdown from '@/components/SearchableDropdown';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import { UNIVERSITIES, MAJORS, LOCATIONS, SKILLS, TOP_25_UNIVERSITIES, CAREER_INTERESTS } from '@/lib/profile-data';
import { getEmployerJobs } from '@/lib/firebase-firestore';

interface Candidate {
  id: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  school?: string;
  major?: string;
  skills?: string[];
  location?: string;
  email: string;
  createdAt: any; // Firestore timestamp
  [key: string]: any; // Allow additional properties from Firestore
}

export default function SearchCandidatesPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Filter states
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]);
  const [isTop25Selected, setIsTop25Selected] = useState(false);
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [hasProfileImage, setHasProfileImage] = useState(false);
  const [hasBio, setHasBio] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Match to Job filter states
  const [selectedJobId, setSelectedJobId] = useState('');
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [matchToJobGpa, setMatchToJobGpa] = useState('');
  const [matchToJobCareerInterests, setMatchToJobCareerInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    if (profile && profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER') {
      router.push("/home/seeker");
      return;
    }

    // Block access for unverified employers
    if (profile && profile.role === 'EMPLOYER' && profile.status !== 'verified') {
      router.push("/home/employer");
      return;
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (user && profile && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER')) {
      loadAllCandidates();
      loadEmployerJobs();
    }
  }, [user, profile]);

  const loadEmployerJobs = async () => {
    if (!user) return;
    
    try {
      const { data: jobs, error } = await getEmployerJobs(user.uid);
      if (!error && jobs) {
        setAvailableJobs(jobs);
      }
    } catch (error) {
      console.error('Error loading employer jobs:', error);
    }
  };

  const loadAllCandidates = async () => {
    setIsLoading(true);
    try {
      const { data: candidateProfiles, error } = await getProfilesByRole('JOB_SEEKER');
      
      if (error || !candidateProfiles) {
        setCandidates([]);
      } else {
        // Filter out profiles without basic information
        const validCandidates = candidateProfiles.filter((candidate: any) => 
          candidate.firstName && 
          candidate.lastName && 
          candidate.email
        ) as Candidate[];
        setCandidates(validCandidates);
      }
    } catch (error) {
      setCandidates([]);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() && selectedUniversities.length === 0 && !isTop25Selected && selectedMajors.length === 0 && selectedLocations.length === 0 && selectedSkills.length === 0 && !hasVideo && !hasResume && !hasProfileImage && !hasBio) {
      loadAllCandidates();
      return;
    }

    setIsLoading(true);
    try {
      const { data: candidateProfiles, error } = await getProfilesByRole('JOB_SEEKER');
      
      if (error) {
        console.error('Error searching candidates:', error);
        return;
      }

      if (candidateProfiles) {
        let filteredCandidates = candidateProfiles;

        // Text search
        if (searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase();
          filteredCandidates = filteredCandidates.filter((candidate: any) => {
            const firstName = candidate.firstName?.toLowerCase() || '';
            const lastName = candidate.lastName?.toLowerCase() || '';
            const headline = candidate.headline?.toLowerCase() || '';
            const school = candidate.school?.toLowerCase() || '';
            const major = candidate.major?.toLowerCase() || '';
            const skills = candidate.skills?.join(' ').toLowerCase() || '';
            const location = candidate.location?.toLowerCase() || '';
            const bio = candidate.bio?.toLowerCase() || '';

            return (
              firstName.includes(searchLower) ||
              lastName.includes(searchLower) ||
              headline.includes(searchLower) ||
              school.includes(searchLower) ||
              major.includes(searchLower) ||
              skills.includes(searchLower) ||
              location.includes(searchLower) ||
              bio.includes(searchLower)
            );
          });
        }

        // Universities filter (multiple selection or Top 25)
        if (isTop25Selected) {
          filteredCandidates = filteredCandidates.filter((candidate: any) =>
            TOP_25_UNIVERSITIES.includes(candidate.school)
          );
        } else if (selectedUniversities.length > 0) {
          filteredCandidates = filteredCandidates.filter((candidate: any) =>
            selectedUniversities.includes(candidate.school)
          );
        }

        // Major filter (multi)
        if (selectedMajors.length > 0) {
          filteredCandidates = filteredCandidates.filter((candidate: any) =>
            selectedMajors.includes(candidate.major)
          );
        }

        // Location filter (multi)
        if (selectedLocations.length > 0) {
          filteredCandidates = filteredCandidates.filter((candidate: any) =>
            selectedLocations.includes(candidate.location)
          );
        }

        // Skills filter
        if (selectedSkills.length > 0) {
          filteredCandidates = filteredCandidates.filter((candidate: any) =>
            selectedSkills.some(skill => 
              candidate.skills?.includes(skill)
            )
          );
        }

        // Profile completeness filters
        if (hasVideo) {
          filteredCandidates = filteredCandidates.filter((candidate: any) =>
            candidate.videoUrl
          );
        }

        if (hasResume) {
          filteredCandidates = filteredCandidates.filter((candidate: any) =>
            candidate.resumeUrl
          );
        }

        if (hasProfileImage) {
          filteredCandidates = filteredCandidates.filter((candidate: any) =>
            candidate.profileImageUrl
          );
        }

        if (hasBio) {
          filteredCandidates = filteredCandidates.filter((candidate: any) =>
            candidate.bio && candidate.bio.trim().length > 0
          );
        }

        // Filter out profiles without basic information
        const validCandidates = filteredCandidates.filter((candidate: any) => 
          candidate.firstName && 
          candidate.lastName && 
          candidate.email
        ) as Candidate[];
        
        setCandidates(validCandidates);
      }
    } catch (error) {
      console.error('Error searching candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedUniversities([]);
    setIsTop25Selected(false);
    setSelectedMajors([]);
    setSelectedLocations([]);
    setSelectedSkills([]);
    setHasVideo(false);
    setHasResume(false);
    setHasProfileImage(false);
    setHasBio(false);
    setSearchTerm('');
    clearJobMatch();
  };

  const hasActiveFilters = selectedUniversities.length > 0 || isTop25Selected || selectedMajors.length > 0 || selectedLocations.length > 0 || selectedSkills.length > 0 || hasVideo || hasResume || hasProfileImage || hasBio || searchTerm.trim() || selectedJobId;

  const handleTop25Schools = () => {
    setIsTop25Selected(true);
    setSelectedUniversities([]);
    setSearchTerm('');
    setSelectedMajors([]);
    setSelectedLocations([]);
    setSelectedSkills([]);
    setHasVideo(false);
    setHasResume(false);
    setHasProfileImage(false);
    setHasBio(false);
    handleSearch();
  };

  const removeTop25Filter = () => {
    setIsTop25Selected(false);
    handleSearch();
  };

  const handleJobSelection = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = availableJobs.find(j => j.id === jobId);
    setSelectedJob(job);
    
    if (job) {
      // Apply job requirements as filters
      if (job.requiredGpa) {
        setMatchToJobGpa(job.requiredGpa);
      }
      if (job.requiredCareerInterests && job.requiredCareerInterests.length > 0) {
        setMatchToJobCareerInterests(job.requiredCareerInterests);
      }
      
      // Clear other filters and search
      setSelectedUniversities([]);
      setIsTop25Selected(false);
      setSelectedMajors([]);
      setSelectedLocations([]);
      setSelectedSkills([]);
      setHasVideo(false);
      setHasResume(false);
      setHasProfileImage(false);
      setHasBio(false);
      setSearchTerm('');
      
      // Apply the job-based filters
      handleSearchWithJobRequirements(job);
    }
  };

  const handleSearchWithJobRequirements = async (job: any) => {
    setIsLoading(true);
    try {
      const { data: candidateProfiles, error } = await getProfilesByRole('JOB_SEEKER');
      
      if (error) {
        console.error('Error searching candidates:', error);
        return;
      }

      let filteredCandidates = candidateProfiles.filter((candidate: any) => 
        candidate.firstName && 
        candidate.lastName && 
        candidate.email
      ) as Candidate[];

      // Apply GPA filter if specified
      if (job.requiredGpa) {
        const requiredGpa = parseFloat(job.requiredGpa);
        filteredCandidates = filteredCandidates.filter((candidate: any) => {
          // Check if candidate has GPA in education array
          if (candidate.education && candidate.education.length > 0) {
            return candidate.education.some((edu: any) => {
              if (edu.gpa) {
                const candidateGpa = parseFloat(edu.gpa.split('-')[0]); // Take min GPA from range
                return candidateGpa >= requiredGpa;
              }
              return false;
            });
          }
          // Fallback to legacy GPA field
          if (candidate.gpa) {
            const candidateGpa = parseFloat(candidate.gpa.split('-')[0]);
            return candidateGpa >= requiredGpa;
          }
          return false;
        });
      }

      // Apply career interests filter if specified
      if (job.requiredCareerInterests && job.requiredCareerInterests.length > 0) {
        filteredCandidates = filteredCandidates.filter((candidate: any) => {
          if (candidate.careerInterests && candidate.careerInterests.length > 0) {
            // Check if candidate has at least one matching career interest
            return job.requiredCareerInterests.some((requiredInterest: string) =>
              candidate.careerInterests.includes(requiredInterest)
            );
          }
          return false;
        });
      }

      setCandidates(filteredCandidates);
    } catch (error) {
      console.error('Error searching candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearJobMatch = () => {
    setSelectedJobId('');
    setSelectedJob(null);
    setMatchToJobGpa('');
    setMatchToJobCareerInterests([]);
    loadAllCandidates();
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F8FAFC 100%)'}}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-navy-800 mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) {
    return null; // Will redirect
  }

  const filterCount = [selectedUniversities.length > 0 ? 1 : 0, isTop25Selected ? 1 : 0, selectedMajors.length, selectedLocations.length, selectedSkills.length, hasVideo, hasResume, hasProfileImage, hasBio, searchTerm.trim() ? 1 : 0, selectedJobId ? 1 : 0].filter(Boolean).length;

  return (
    <div className="min-h-screen mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full" style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F8FAFC 100%)'}}>
      <div className="w-full md:max-w-7xl md:mx-auto px-0 sm:px-3 md:px-6 lg:px-8 pt-12 sm:pt-16 md:pt-20 pb-4 sm:pb-6 md:pb-10 min-w-0">
        {/* Breadcrumb */}
        <section className="mb-4 sm:mb-6 md:mb-8 px-2 sm:px-0">
          <Link 
            href="/home/employer"
            className="flex items-center text-navy-800 font-semibold hover:text-navy-900 transition-all duration-200 bg-sky-200/10 hover:bg-sky-200/20 px-3 sm:px-4 py-2 rounded-full w-fit min-h-[44px] text-sm sm:text-base hover:shadow-md hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </section>

        {/* Page Header */}
        <section className="mb-4 sm:mb-6 md:mb-10 px-2 sm:px-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-navy-900 mb-2 break-words">Find Your Perfect Candidate</h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-600 break-words">Search through talented job seekers to find the right fit for your company.</p>
        </section>

        {/* Search Toolbar */}
        <section className="sticky top-16 sm:top-20 z-30 bg-white/90 backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 mb-3 sm:mb-6 md:mb-8 mobile-safe-top">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            <div className="flex-1 relative">
              <input 
                type="text"
                placeholder="Search by name, skills, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="w-full px-4 py-3 pl-10 sm:pl-12 text-base border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-400 focus:ring-2 sm:focus:ring-4 focus:ring-sky-300/30 transition-all duration-200 min-h-[44px]"
                aria-label="Search candidates"
              />
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="relative bg-white border border-gray-300 text-gray-700 font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all duration-200 flex items-center justify-center space-x-2 min-h-[44px] text-sm sm:text-base"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <div className="absolute -top-2 -right-2 bg-navy-800 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                    {filterCount}
                  </div>
                )}
              </button>
              <button 
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-navy-800 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 md:px-8 rounded-lg hover:bg-navy-700 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span>Search</span>
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-6 mt-6 space-y-6">
              {/* Match to Job Filter */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Match to Job</h3>
                <p className="text-sm text-blue-700 mb-4">Select a job to automatically filter candidates based on job requirements.</p>
                
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-blue-800 mb-2">Select Job</label>
                    <select
                      value={selectedJobId}
                      onChange={(e) => handleJobSelection(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Choose a job...</option>
                      {availableJobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title} - {job.locationCity}, {job.locationState}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedJobId && (
                    <button
                      onClick={clearJobMatch}
                      className="px-3 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Show applied job requirements */}
                {selectedJob && (
                  <div className="mt-4 p-3 bg-white border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Applied Requirements:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.requiredGpa && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          GPA: {selectedJob.requiredGpa}+
                        </span>
                      )}
                      {selectedJob.requiredCareerInterests && selectedJob.requiredCareerInterests.length > 0 && (
                        selectedJob.requiredCareerInterests.map((interest: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            {interest}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">University</label>
                  <div className="space-y-2">
                    {isTop25Selected && (
                      <div className="flex items-center justify-between p-2 bg-blue-100 border border-blue-300 rounded-lg">
                        <span className="text-sm font-medium text-blue-800">Top 25</span>
                        <button
                          onClick={removeTop25Filter}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {!isTop25Selected && (
                      <MultiSelectDropdown
                        options={UNIVERSITIES}
                        values={selectedUniversities}
                        onChange={setSelectedUniversities}
                        placeholder="Any university"
                        label=""
                        allowCustom
                      />
                    )}
                  </div>
                </div>
                
                <MultiSelectDropdown
                  options={MAJORS}
                  values={selectedMajors}
                  onChange={setSelectedMajors}
                  placeholder="Any major"
                  label="Major"
                  allowCustom
                />
                
                <MultiSelectDropdown
                  options={LOCATIONS}
                  values={selectedLocations}
                  onChange={setSelectedLocations}
                  placeholder="Any location"
                  label="Location"
                  allowCustom
                />
                
                <MultiSelectDropdown
                  options={SKILLS}
                  values={selectedSkills}
                  onChange={setSelectedSkills}
                  placeholder="Select skills"
                  label="Required Skills"
                  allowCustom
                />
              </div>

              {/* Profile Completeness Filters */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Completeness</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasVideo}
                      onChange={(e) => setHasVideo(e.target.checked)}
                      className="h-4 w-4 text-navy-800 focus:ring-navy-800 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Has Video</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasResume}
                      onChange={(e) => setHasResume(e.target.checked)}
                      className="h-4 w-4 text-navy-800 focus:ring-navy-800 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Has Resume</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasProfileImage}
                      onChange={(e) => setHasProfileImage(e.target.checked)}
                      className="h-4 w-4 text-navy-800 focus:ring-navy-800 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Has Photo</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasBio}
                      onChange={(e) => setHasBio(e.target.checked)}
                      className="h-4 w-4 text-navy-800 focus:ring-navy-800 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Has Bio</span>
                  </label>
                </div>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={handleTop25Schools}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Top 25
                </button>
                
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-gray-500 hover:text-gray-700 text-sm flex items-center"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Results Meta */}
        <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-navy-900">
              {isLoading ? 'Searching...' : `Found ${candidates.length} candidate${candidates.length !== 1 ? 's' : ''}`}
            </h2>
          </div>
          {candidates.length > 0 && (
            <div className="text-sm text-gray-500">
              Showing {candidates.length} result{candidates.length !== 1 ? 's' : ''}
            </div>
          )}
        </section>

        {/* Results Grid */}
        {isInitialLoad && !isLoading ? (
          <div className="w-full min-w-0 text-center py-12 sm:py-16 bg-white rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-gray-200">
            <Search className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm sm:text-base text-gray-500 px-4">Use the search bar above to find candidates</p>
          </div>
        ) : isLoading ? (
          <div className="w-full min-w-0 text-center py-12 sm:py-16 bg-white rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200">
            <Loader2 className="h-8 w-8 animate-spin text-navy-800 mx-auto mb-4" />
            <p className="text-sm sm:text-base text-gray-600">Searching for candidates...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="w-full min-w-0 text-center py-12 sm:py-16 bg-white rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200">
            <User className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm sm:text-base text-slate-500 px-4">No candidates found matching your criteria</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 px-4">Try adjusting your search terms or filters</p>
            <button
              onClick={clearFilters}
              className="mt-4 bg-navy-800 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-navy-700 transition-colors min-h-[44px] text-sm sm:text-base"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="w-full min-w-0 bg-white p-4 sm:p-5 md:p-6 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-navy-900 break-words">
                      {candidate.firstName} {candidate.lastName}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 break-words">{candidate.headline || 'No headline'}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100">
                    <span className="font-bold text-green-700">{getInitials(candidate.firstName, candidate.lastName)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4 text-sm text-gray-700">
                  {candidate.school && (
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="h-4 w-4 text-gray-400" />
                      <span>{candidate.school}</span>
                    </div>
                  )}
                  
                  {candidate.major && (
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-gray-400" />
                      <span>{candidate.major}</span>
                    </div>
                  )}
                  
                  {candidate.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{candidate.location}</span>
                    </div>
                  )}
                </div>

                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm text-gray-800 mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.slice(0, 4).map((skill, index) => (
                        <span
                          key={index}
                          className="bg-sky-100 text-navy-800 px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                      {candidate.skills.length > 4 && (
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                          +{candidate.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-4">
                  <span className="text-xs text-gray-500">
                    Member since {candidate.createdAt ? new Date(candidate.createdAt.toDate ? candidate.createdAt.toDate() : candidate.createdAt).toLocaleDateString() : 'Recently'}
                  </span>
                  <div className="flex space-x-2">
                    <Link
                      href={`/candidate/${candidate.id}`}
                      className="bg-navy-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-navy-700 transition-colors"
                    >
                      View Profile
                    </Link>
                    <Link
                      href={`/candidate/${candidate.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg w-10 h-10 flex items-center justify-center transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}