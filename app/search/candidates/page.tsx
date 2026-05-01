"use client";
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, User, MapPin, GraduationCap, Star, Loader2, Filter, X, MessageSquare } from "lucide-react";
import { getPipelineByJob, getProfilesByRole, normalizePipelineStage } from '@/lib/firebase-firestore';
import { postJobPipeline } from '@/lib/pipeline-client';
import SearchableDropdown from '@/components/SearchableDropdown';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import { UNIVERSITIES, MAJORS, LOCATIONS, SKILLS, TOP_25_UNIVERSITIES, CAREER_INTERESTS } from '@/lib/profile-data';
import { getCompanyJobs, getDocument, getEmployerJobs } from '@/lib/firebase-firestore';
import { calculateCompletion } from '@/components/ProfileCompletionProvider';
import { useToast } from '@/components/NotificationSystem';
import { getCandidateUrl, getEmployerPoolsUrl, getJobCompareUrl, getJobMatchesUrl, getJobOverviewUrl, getJobPipelineUrl } from '@/lib/navigation';
import { pipelineStageLabel } from "@/lib/recruiter-ui";
import {
  fetchTalentPool,
  fetchTalentPools,
  fetchTalentPoolMembershipLookup,
  type TalentPool,
  type TalentPoolMembershipBadge,
} from '@/lib/talent-pools-client';
import AddToTalentPoolButton from '@/components/employer/AddToTalentPoolButton';
import { isClientAdminUser } from "@/lib/admin-access";

interface Candidate {
  id: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  school?: string;
  major?: string;
  skills?: string[];
  location?: string;
  email?: string;
  createdAt: any; // Firestore timestamp
  [key: string]: any; // Allow additional properties from Firestore
}

export default function SearchCandidatesPage() {
  const toast = useToast();
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scopedJobId = searchParams.get('jobId');
  const poolInParam = searchParams.get('poolIn') || '';
  const poolNotParam = searchParams.get('poolNot') || '';
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
  const [scopedJob, setScopedJob] = useState<any>(null);
  const [pipelineStageByCandidate, setPipelineStageByCandidate] = useState<Record<string, string>>({});
  const [pipelineBusyCandidateId, setPipelineBusyCandidateId] = useState<string | null>(null);
  const [matchToJobGpa, setMatchToJobGpa] = useState('');
  const [matchToJobCareerInterests, setMatchToJobCareerInterests] = useState<string[]>([]);

  const [talentPools, setTalentPools] = useState<TalentPool[]>([]);
  const [poolIncludeId, setPoolIncludeId] = useState('');
  const [poolExcludeId, setPoolExcludeId] = useState('');
  const [poolIncludeIds, setPoolIncludeIds] = useState<Set<string> | null>(null);
  const [poolExcludeIds, setPoolExcludeIds] = useState<Set<string> | null>(null);
  const [poolFilterLoading, setPoolFilterLoading] = useState(false);
  const [poolBadgesByCandidate, setPoolBadgesByCandidate] = useState<Record<string, TalentPoolMembershipBadge[]>>({});

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

  useEffect(() => {
    setPoolIncludeId(poolInParam);
    setPoolExcludeId(poolNotParam);
  }, [poolInParam, poolNotParam]);

  useEffect(() => {
    if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER' && profile.role !== 'ADMIN')) return;
    (async () => {
      const token = await user.getIdToken();
      const res = await fetchTalentPools(token);
      if (res.ok) setTalentPools(res.data.pools || []);
    })();
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setPoolFilterLoading(true);
      const token = await user.getIdToken();
      if (poolIncludeId) {
        const res = await fetchTalentPool(poolIncludeId, token);
        if (cancelled) return;
        if (res.ok) {
          setPoolIncludeIds(new Set((res.data.members || []).map((m: { candidateId?: string }) => String(m.candidateId || ""))));
        } else setPoolIncludeIds(new Set());
      } else {
        setPoolIncludeIds(null);
      }
      if (poolExcludeId) {
        const res = await fetchTalentPool(poolExcludeId, token);
        if (cancelled) return;
        if (res.ok) {
          setPoolExcludeIds(new Set((res.data.members || []).map((m: { candidateId?: string }) => String(m.candidateId || ""))));
        } else setPoolExcludeIds(new Set());
      } else {
        setPoolExcludeIds(null);
      }
      if (!cancelled) setPoolFilterLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [poolIncludeId, poolExcludeId, user]);

  const displayCandidates = useMemo(() => {
    let list = candidates;
    if (poolIncludeId && poolIncludeIds === null) {
      return [];
    }
    if (poolIncludeId && poolIncludeIds) {
      list = list.filter((c) => poolIncludeIds.has(c.id));
    }
    if (poolExcludeId && poolExcludeIds === null) {
      return [];
    }
    if (poolExcludeId && poolExcludeIds) {
      list = list.filter((c) => !poolExcludeIds.has(c.id));
    }
    return list;
  }, [candidates, poolIncludeId, poolExcludeId, poolIncludeIds, poolExcludeIds]);

  const candidateIdsKey = useMemo(() => candidates.map((c) => c.id).join(","), [candidates]);

  useEffect(() => {
    if (!scopedJobId || !user || !candidates.length) {
      setPoolBadgesByCandidate({});
      return;
    }
    let cancelled = false;
    const ids = candidates.slice(0, 100).map((c) => c.id);
    (async () => {
      const token = await user.getIdToken();
      const res = await fetchTalentPoolMembershipLookup(token, ids);
      if (!cancelled && res.ok) setPoolBadgesByCandidate(res.data.byCandidate || {});
    })();
    return () => {
      cancelled = true;
    };
  }, [scopedJobId, user, candidateIdsKey]);

  const loadEmployerJobs = async () => {
    if (!user || !profile) return;
    
    try {
      const { data: jobs, error } =
        profile.role === 'RECRUITER' && profile.companyId
          ? await getCompanyJobs(profile.companyId, user.uid, Boolean(profile.isCompanyOwner))
          : await getEmployerJobs(user.uid);
      if (!error && jobs) {
        setAvailableJobs(jobs);
      }
    } catch (error) {
      console.error('Error loading employer jobs:', error);
    }
  };

  useEffect(() => {
    const loadScopedJobContext = async () => {
      if (!scopedJobId) {
        setScopedJob(null);
        setPipelineStageByCandidate({});
        return;
      }
      const { data: jobData } = await getDocument('jobs', scopedJobId);
      setScopedJob(jobData || null);

      const { data: entries } = await getPipelineByJob(scopedJobId);
      const stageByCandidate: Record<string, string> = {};
      for (const entry of entries || []) {
        if (entry?.candidateId) {
          stageByCandidate[String(entry.candidateId)] = normalizePipelineStage(entry.stage as any);
        }
      }
      setPipelineStageByCandidate(stageByCandidate);
    };
    loadScopedJobContext();
  }, [scopedJobId]);

  useEffect(() => {
    if (!scopedJobId || !availableJobs.length) return;
    const matchingJob = availableJobs.find((job) => job.id === scopedJobId);
    if (matchingJob) {
      setSelectedJobId(scopedJobId);
      setSelectedJob(matchingJob);
    }
  }, [scopedJobId, availableJobs]);

  const loadAllCandidates = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const { data: candidateProfiles, error } = await getProfilesByRole('JOB_SEEKER', token, {
        verifyAuthUsers: false,
      });
      
      if (error || !candidateProfiles) {
        setCandidates([]);
      } else {
        // Check if user is admin - admins can see all profiles regardless of completion
        const isAdmin = isClientAdminUser(profile?.role as string | undefined, user?.email);
        
        // Filter out profiles without basic information and ensure 70%+ completion (unless admin)
        const validCandidates = candidateProfiles.filter((candidate: any) => {
          if (!candidate.firstName || !candidate.lastName || !candidate.id) {
            return false;
          }
          // Admins can see all profiles, others need 70%+ completion
          if (isAdmin) {
            return true;
          }
          const completion =
            typeof candidate.profileCompletionPercent === "number"
              ? candidate.profileCompletionPercent
              : calculateCompletion(candidate);
          return completion >= 70;
        }) as Candidate[];
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

    if (!user) return;
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const { data: candidateProfiles, error } = await getProfilesByRole('JOB_SEEKER', token, {
        verifyAuthUsers: false,
      });
      
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
          filteredCandidates = filteredCandidates.filter(
            (candidate: any) => candidate.videoUrl || candidate.hasVideo
          );
        }

        if (hasResume) {
          filteredCandidates = filteredCandidates.filter(
            (candidate: any) => candidate.resumeUrl || candidate.hasResume
          );
        }

        if (hasProfileImage) {
          filteredCandidates = filteredCandidates.filter(
            (candidate: any) => candidate.profileImageUrl || candidate.hasProfileImage
          );
        }

        if (hasBio) {
          filteredCandidates = filteredCandidates.filter((candidate: any) =>
            candidate.bio && candidate.bio.trim().length > 0
          );
        }

        // Check if user is admin - admins can see all profiles regardless of completion
        const isAdmin = isClientAdminUser(profile?.role as string | undefined, user?.email);
        
        // Filter out profiles without basic information and ensure 70%+ completion (unless admin)
        const validCandidates = filteredCandidates.filter((candidate: any) => {
          if (!candidate.firstName || !candidate.lastName || !candidate.id) {
            return false;
          }
          if (isAdmin) {
            return true;
          }
          const completion =
            typeof candidate.profileCompletionPercent === "number"
              ? candidate.profileCompletionPercent
              : calculateCompletion(candidate);
          return completion >= 70;
        }) as Candidate[];
        
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
    setPoolIncludeId('');
    setPoolExcludeId('');
    const p = new URLSearchParams(searchParams.toString());
    p.delete('poolIn');
    p.delete('poolNot');
    router.replace(`${pathname}?${p.toString()}`);
    clearJobMatch();
  };

  const applyPoolInclude = (id: string) => {
    setPoolIncludeId(id);
    const p = new URLSearchParams(searchParams.toString());
    if (id) p.set('poolIn', id);
    else p.delete('poolIn');
    router.replace(`${pathname}?${p.toString()}`);
  };

  const applyPoolExclude = (id: string) => {
    setPoolExcludeId(id);
    const p = new URLSearchParams(searchParams.toString());
    if (id) p.set('poolNot', id);
    else p.delete('poolNot');
    router.replace(`${pathname}?${p.toString()}`);
  };

  const hasActiveFilters =
    selectedUniversities.length > 0 ||
    isTop25Selected ||
    selectedMajors.length > 0 ||
    selectedLocations.length > 0 ||
    selectedSkills.length > 0 ||
    hasVideo ||
    hasResume ||
    hasProfileImage ||
    hasBio ||
    searchTerm.trim() ||
    selectedJobId ||
    Boolean(poolIncludeId) ||
    Boolean(poolExcludeId);

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
    if (!user) return;
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const { data: candidateProfiles, error } = await getProfilesByRole('JOB_SEEKER', token, {
        verifyAuthUsers: false,
      });
      
      if (error) {
        console.error('Error searching candidates:', error);
        return;
      }

      let filteredCandidates = candidateProfiles.filter(
        (candidate: any) => candidate.firstName && candidate.lastName && candidate.id
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

  const handleScopedPipelineAction = async (candidateId: string, stage: 'NEW' | 'SHORTLIST') => {
    if (!scopedJobId || !user) return;
    setPipelineBusyCandidateId(candidateId);
    try {
      const token = await user.getIdToken();
      const res = await postJobPipeline(scopedJobId, { candidateId, stage }, token);
      if (!res.ok) {
        toast.error('Pipeline', res.error || 'Could not update workflow for this job.');
        return;
      }
      setPipelineStageByCandidate((prev) => ({ ...prev, [candidateId]: stage }));
      if (stage === 'SHORTLIST') {
        toast.success('Shortlist', 'Added to your working shortlist. Review or compare from the links above.');
      } else {
        toast.success('Pipeline', 'Candidate is in the pipeline on NEW. Refine stage from matches or pipeline.');
      }
    } finally {
      setPipelineBusyCandidateId(null);
    }
  };

  const getMessageContextUrl = (candidateId: string) => {
    const base = getCandidateUrl(candidateId, scopedJobId || undefined);
    return `${base}${base.includes('?') ? '&' : '?'}action=message`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-navy-800 mx-auto mb-4" />
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) {
    return null; // Will redirect
  }

  const filterCount = [
    selectedUniversities.length > 0 ? 1 : 0,
    isTop25Selected ? 1 : 0,
    selectedMajors.length,
    selectedLocations.length,
    selectedSkills.length,
    hasVideo,
    hasResume,
    hasProfileImage,
    hasBio,
    searchTerm.trim() ? 1 : 0,
    selectedJobId ? 1 : 0,
    poolIncludeId ? 1 : 0,
    poolExcludeId ? 1 : 0,
  ].filter(Boolean).length;
  const inPipelineCount = Object.keys(pipelineStageByCandidate).length;
  const shortlistedCount = Object.values(pipelineStageByCandidate).filter((stage) => String(stage).toUpperCase() === 'SHORTLIST').length;

  return (
    <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full">
      <div className="w-full md:max-w-7xl md:mx-auto px-0 sm:px-3 md:px-6 lg:px-8 pt-12 sm:pt-16 md:pt-20 pb-4 sm:pb-6 md:pb-10 min-w-0">
        {/* Page Header */}
        <section className="mb-4 sm:mb-6 md:mb-10 px-2 sm:px-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-navy-900 mb-2 break-words">
            {scopedJobId ? 'Sourcing candidates for this requisition' : 'Talent Search'}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-600 break-words">
            {scopedJobId
              ? 'Job-scoped sourcing keeps every action tied to this requisition.'
              : 'Discover talent across the network. Choose a job when you are ready to take job-specific actions.'}
          </p>
        </section>

        {scopedJobId && (
          <section className="mb-4 sm:mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 mb-1">Job-scoped sourcing mode</p>
            <h2 className="text-base sm:text-lg font-semibold text-navy-900">{scopedJob?.title || 'Current requisition'}</h2>
            <p className="text-sm text-slate-600 mt-1">
              Source for this requisition, promote contenders into shortlist, then compare and message in the same workflow.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 font-semibold text-sky-950">
                Shortlist: {shortlistedCount}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">
                In pipeline: {inPipelineCount}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <Link href={getJobOverviewUrl(scopedJobId)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-navy-800 font-medium hover:bg-slate-50">
                Job overview
              </Link>
              <Link href={getJobMatchesUrl(scopedJobId)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-navy-800 font-medium hover:bg-slate-50">
                Matches
              </Link>
              <Link href={`${getJobPipelineUrl(scopedJobId)}?stage=SHORTLIST`} className="px-3 py-2 rounded-lg border border-sky-200 bg-sky-50 text-navy-900 font-semibold hover:bg-sky-100">
                Shortlist column
              </Link>
              <Link href={getJobPipelineUrl(scopedJobId)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-navy-800 font-medium hover:bg-slate-50">
                Full pipeline
              </Link>
              <Link
                href={getJobCompareUrl(scopedJobId)}
                className="px-3 py-2 rounded-lg border border-sky-200 bg-sky-50 text-navy-900 font-semibold hover:bg-sky-100"
              >
                Compare shortlist
              </Link>
            </div>
          </section>
        )}

        {/* Search Toolbar */}
        {/* FIX1: sticky offset matches JobWorkspaceNav / fixed header clearance (top-20) */}
        <section className="sticky top-20 z-30 bg-white/90 backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 mb-3 sm:mb-6 md:mb-8 mobile-safe-top">
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
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="relative bg-white border border-slate-300 text-slate-700 font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg hover:bg-slate-50 hover:shadow-sm transition-all duration-200 flex items-center justify-center space-x-2 min-h-[44px] text-sm sm:text-base"
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
            <div className="border-t border-slate-200 pt-6 mt-6 space-y-6">
              {/* Match to Job Filter */}
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                <h3 className="mb-3 text-lg font-semibold text-navy-900">Match to Job</h3>
                <p className="mb-4 text-sm text-slate-700">Select a job to automatically filter candidates based on job requirements.</p>
                
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-medium text-navy-800">Select Job</label>
                    <select
                      value={selectedJobId}
                      onChange={(e) => handleJobSelection(e.target.value)}
                      className="w-full rounded-lg border border-sky-300 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-sky-500"
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
                      className="rounded-lg border border-sky-300 px-3 py-2 text-sky-800 transition-colors hover:bg-sky-100 hover:text-navy-900"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Show applied job requirements */}
                {selectedJob && (
                  <div className="mt-4 rounded-lg border border-sky-200 bg-white p-3">
                    <h4 className="mb-2 font-medium text-navy-900">Applied Requirements:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.requiredGpa && (
                        <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-900">
                          GPA: {selectedJob.requiredGpa}+
                        </span>
                      )}
                      {selectedJob.requiredCareerInterests && selectedJob.requiredCareerInterests.length > 0 && (
                        selectedJob.requiredCareerInterests.map((interest: string, index: number) => (
                          <span key={index} className="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-800">
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">University</label>
                  <div className="space-y-2">
                    {isTop25Selected && (
                      <div className="flex items-center justify-between rounded-lg border border-sky-300 bg-sky-100 p-2">
                        <span className="text-sm font-medium text-navy-800">Top 25</span>
                        <button
                          onClick={removeTop25Filter}
                          className="text-sky-800 hover:text-navy-900"
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
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Talent pools</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Narrow results by saved pool membership.{" "}
                  <Link href={getEmployerPoolsUrl()} className="font-semibold text-sky-800 hover:underline">
                    Manage pools
                  </Link>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Only candidates in pool</label>
                    <select
                      value={poolIncludeId}
                      onChange={(e) => applyPoolInclude(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                    >
                      <option value="">Any pool</option>
                      {talentPools.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Exclude candidates in pool</label>
                    <select
                      value={poolExcludeId}
                      onChange={(e) => applyPoolExclude(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                    >
                      <option value="">None</option>
                      {talentPools.map((p) => (
                        <option key={`ex-${p.id}`} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Profile Completeness</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasVideo}
                      onChange={(e) => setHasVideo(e.target.checked)}
                      className="h-4 w-4 text-navy-800 focus:ring-navy-800 border-slate-300 rounded"
                    />
                    <span className="text-sm text-slate-700">Has Video</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasResume}
                      onChange={(e) => setHasResume(e.target.checked)}
                      className="h-4 w-4 text-navy-800 focus:ring-navy-800 border-slate-300 rounded"
                    />
                    <span className="text-sm text-slate-700">Has Resume</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasProfileImage}
                      onChange={(e) => setHasProfileImage(e.target.checked)}
                      className="h-4 w-4 text-navy-800 focus:ring-navy-800 border-slate-300 rounded"
                    />
                    <span className="text-sm text-slate-700">Has Photo</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasBio}
                      onChange={(e) => setHasBio(e.target.checked)}
                      className="h-4 w-4 text-navy-800 focus:ring-navy-800 border-slate-300 rounded"
                    />
                    <span className="text-sm text-slate-700">Has Bio</span>
                  </label>
                </div>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={handleTop25Schools}
                  className="flex items-center rounded-lg bg-navy-800 px-4 py-2 text-white transition-colors hover:bg-navy-700"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Top 25
                </button>
                
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-slate-500 hover:text-slate-700 text-sm flex items-center"
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
              {isLoading || poolFilterLoading
                ? 'Searching...'
                : `Found ${displayCandidates.length} candidate${displayCandidates.length !== 1 ? 's' : ''}`}
            </h2>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${scopedJobId ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'}`}>
              {scopedJobId ? 'Job-scoped mode' : 'Global mode'}
            </span>
          </div>
          {displayCandidates.length > 0 && (
            <div className="text-sm text-slate-500">
              Showing {displayCandidates.length} result{displayCandidates.length !== 1 ? 's' : ''}
              {(poolIncludeId || poolExcludeId) && (
                <span className="ml-2 text-sky-700 font-medium">· Pool filter on</span>
              )}
            </div>
          )}
        </section>

        {/* Results Grid */}
        {isInitialLoad && !isLoading ? (
          <div className="w-full min-w-0 text-center py-12 sm:py-16 bg-white rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200">
            <Search className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm sm:text-base text-slate-500 px-4">Use the search bar above to find candidates</p>
          </div>
        ) : isLoading ? (
          <div className="w-full min-w-0 text-center py-12 sm:py-16 bg-white rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200">
            <Loader2 className="h-8 w-8 animate-spin text-navy-800 mx-auto mb-4" />
            <p className="text-sm sm:text-base text-slate-600">Searching for candidates...</p>
          </div>
        ) : displayCandidates.length === 0 ? (
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
            {displayCandidates.map((candidate) => (
              <div key={candidate.id} className="w-full min-w-0 bg-white p-4 sm:p-5 md:p-6 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-navy-900 break-words">
                      {candidate.firstName} {candidate.lastName}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 break-words">{candidate.headline || 'No headline'}</p>
                    {scopedJobId && poolBadgesByCandidate[candidate.id]?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {poolBadgesByCandidate[candidate.id].map((b) => (
                          <span
                            key={`${candidate.id}-${b.poolId}`}
                            className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-900"
                          >
                            Pool: {b.poolName}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                    <span className="font-bold text-navy-800">{getInitials(candidate.firstName, candidate.lastName)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4 text-sm text-slate-700">
                  {candidate.school && (
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="h-4 w-4 text-slate-400" />
                      <span>{candidate.school}</span>
                    </div>
                  )}
                  
                  {candidate.major && (
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-slate-400" />
                      <span>{candidate.major}</span>
                    </div>
                  )}
                  
                  {candidate.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{candidate.location}</span>
                    </div>
                  )}
                </div>

                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm text-slate-800 mb-2">Skills</h4>
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
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">
                          +{candidate.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-4">
                  <span className="text-xs text-slate-500">
                    Member since {candidate.createdAt ? new Date(candidate.createdAt.toDate ? candidate.createdAt.toDate() : candidate.createdAt).toLocaleDateString() : 'Recently'}
                  </span>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {scopedJobId && (
                      <>
                        <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${
                          String(pipelineStageByCandidate[candidate.id] || "").toUpperCase() === "SHORTLIST"
                            ? "border-sky-200 bg-sky-50 text-sky-950"
                            : pipelineStageByCandidate[candidate.id]
                              ? "border-slate-200 bg-slate-100 text-slate-800"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}>
                          {String(pipelineStageByCandidate[candidate.id] || '').toUpperCase() === 'SHORTLIST'
                            ? 'Shortlist contender (working set)'
                            : pipelineStageByCandidate[candidate.id]
                              ? `In pipeline · ${pipelineStageLabel(pipelineStageByCandidate[candidate.id])}`
                              : 'Not on this job’s pipeline yet'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleScopedPipelineAction(candidate.id, 'SHORTLIST')}
                          disabled={pipelineBusyCandidateId === candidate.id}
                          className="bg-navy-800 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-navy-700 transition-colors disabled:opacity-50"
                        >
                          {String(pipelineStageByCandidate[candidate.id] || '').toUpperCase() === 'SHORTLIST' ? 'Shortlisted' : 'Add to shortlist'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScopedPipelineAction(candidate.id, 'NEW')}
                          disabled={pipelineBusyCandidateId === candidate.id}
                          className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          {pipelineStageByCandidate[candidate.id] ? 'Keep in pipeline' : 'Add to pipeline'}
                        </button>
                      </>
                    )}
                    <Link
                      href={getCandidateUrl(candidate.id, scopedJobId || undefined)}
                      className="bg-navy-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-navy-700 transition-colors"
                    >
                      View Profile
                    </Link>
                    <Link
                      href={getMessageContextUrl(candidate.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-800 p-2 text-white transition-colors hover:bg-navy-700"
                      title={scopedJobId ? 'Message in this job context' : 'Message candidate'}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Link>
                    <AddToTalentPoolButton
                      candidateId={candidate.id}
                      alignUp
                      buttonClassName="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-navy-800 hover:bg-slate-50 min-h-[40px]"
                    />
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