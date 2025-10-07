"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { Search, User, MapPin, GraduationCap, Star, Loader2, Filter, X, MessageSquare } from "lucide-react";
import { getProfilesByRole } from '@/lib/firebase-firestore';
import SearchableDropdown from '@/components/SearchableDropdown';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import { UNIVERSITIES, MAJORS, LOCATIONS, SKILLS, TOP_25_UNIVERSITIES } from '@/lib/profile-data';

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

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    if (profile && profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER') {
      router.push("/home/seeker");
      return;
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (user && profile && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER')) {
      loadAllCandidates();
    }
  }, [user, profile]);

  const loadAllCandidates = async () => {
    setIsLoading(true);
    try {
      console.log('Loading all candidates...');
      const { data: candidateProfiles, error } = await getProfilesByRole('JOB_SEEKER');
      
      if (error) {
        console.error('Error fetching candidates:', error);
        setCandidates([]);
      } else if (candidateProfiles) {
        console.log('Raw candidate profiles:', candidateProfiles);
        // Filter out profiles without basic information
        const validCandidates = candidateProfiles.filter((candidate: any) => 
          candidate.firstName && 
          candidate.lastName && 
          candidate.email
        ) as Candidate[];
        console.log('Valid candidates after filtering:', validCandidates);
        setCandidates(validCandidates);
      } else {
        console.log('No candidate profiles returned');
        setCandidates([]);
      }
    } catch (error) {
      console.error('Error loading candidates:', error);
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
    loadAllCandidates();
  };

  const hasActiveFilters = selectedUniversities.length > 0 || isTop25Selected || selectedMajors.length > 0 || selectedLocations.length > 0 || selectedSkills.length > 0 || hasVideo || hasResume || hasProfileImage || hasBio || searchTerm.trim();

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Perfect Candidate</h1>
          <p className="text-gray-600">Search through talented job seekers to find the right fit for your company</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, skills, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 rounded-lg border transition-colors flex items-center ${
                  showFilters 
                    ? 'border-green-500 bg-green-50 text-green-700' 
                    : 'border-gray-300 hover:border-green-400'
                }`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                    {[selectedUniversities.length > 0 ? 1 : 0, isTop25Selected ? 1 : 0, selectedMajors.length, selectedLocations.length, selectedSkills.length, hasVideo, hasResume, hasProfileImage, hasBio, searchTerm.trim() ? 1 : 0].filter(Boolean).length}
                  </span>
                )}
              </button>
              
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              <div className="border-t pt-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Completeness</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasVideo}
                      onChange={(e) => setHasVideo(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Has Video</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasResume}
                      onChange={(e) => setHasResume(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Has Resume</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasProfileImage}
                      onChange={(e) => setHasProfileImage(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Has Photo</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasBio}
                      onChange={(e) => setHasBio(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isLoading ? 'Searching...' : `Found ${candidates.length} candidate${candidates.length !== 1 ? 's' : ''}`}
            </h2>
            
            {candidates.length > 0 && (
              <div className="text-sm text-gray-500">
                Showing {candidates.length} result{candidates.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {isInitialLoad && !isLoading ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Use the search bar above to find candidates</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">Searching for candidates...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No candidates found matching your criteria</p>
              <p className="text-sm text-gray-400 mt-2">Try adjusting your search terms or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {candidate.firstName} {candidate.lastName}
                      </h3>
                      <p className="text-gray-600 text-sm">{candidate.headline || 'No headline'}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-green-600" />
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    {candidate.school && (
                      <div className="flex items-center text-sm text-gray-600">
                        <GraduationCap className="h-4 w-4 mr-2 text-gray-400" />
                        {candidate.school}
                      </div>
                    )}
                    
                    {candidate.major && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Star className="h-4 w-4 mr-2 text-gray-400" />
                        {candidate.major}
                      </div>
                    )}
                    
                    {candidate.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                        {candidate.location}
                      </div>
                    )}
                  </div>

                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 5).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {candidate.skills.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{candidate.skills.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Member since {candidate.createdAt ? new Date(candidate.createdAt.toDate ? candidate.createdAt.toDate() : candidate.createdAt).toLocaleDateString() : 'Recently'}
                    </span>
                    <div className="flex gap-2">
                      <Link
                        href={`/candidate/${candidate.id}`}
                        className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        View Profile
                      </Link>
                      <Link
                        href={`/candidate/${candidate.id}`}
                        className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
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
    </div>
  );
}