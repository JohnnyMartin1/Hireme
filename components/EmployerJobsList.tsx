"use client";
import Link from "next/link";
import { useToast } from '@/components/NotificationSystem';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useEffect, useState, useMemo } from "react";
import { 
  Building,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  ArrowRight,
  Search,
  Filter,
  Users,
  Workflow,
  ChevronDown,
  SortAsc,
  X,
} from "lucide-react";
import { getEmployerJobs, getCompanyJobs, getUserMessageThreads, getPipelineByJob, normalizePipelineStage, queryDocuments, where } from '@/lib/firebase-firestore';
import { deleteDocument } from '@/lib/firebase-firestore';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, limit as firestoreLimit } from 'firebase/firestore';
import {
  getCandidatesSearchUrl,
  getEmployerPoolsUrl,
  getJobCompareUrl,
  getJobMatchesUrl,
  getJobOverviewUrl,
  getJobPipelineUrl,
} from "@/lib/navigation";

interface EmployerJobsListProps {
  limit?: number;
  mode?: "dashboard" | "portfolio";
}

interface JobWithMetrics {
  id: string;
  title: string;
  status: string;
  locationCity?: string;
  locationState?: string;
  employment?: string;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  createdAt: any;
  outreachCount: number;
  pipelineCount: number;
  shortlistCount: number;
  contactedCount: number;
  followUpDueCount: number;
  newStrongMatchesCount: number;
}

type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'outreach-desc' | 'outreach-asc';
type StatusFilter = 'all' | 'ACTIVE' | 'INACTIVE';

export default function EmployerJobsList({ limit, mode = "portfolio" }: EmployerJobsListProps) {
  const toast = useToast();
  const { user, profile } = useFirebaseAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsWithMetrics, setJobsWithMetrics] = useState<JobWithMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch jobs and outreach data
  useEffect(() => {
    const fetchJobsWithMetrics = async () => {
      if (!user) {
        setJobs([]);
        setJobsWithMetrics([]);
        setIsLoading(false);
        return;
      }
      if (!profile) return;

      setIsLoading(true);
      try {
        const { data: jobsData, error } = profile.companyId
          ? await getCompanyJobs(profile.companyId, user.uid, profile.isCompanyOwner || false)
          : await getEmployerJobs(user.uid);
        if (error) {
          console.error('Error fetching jobs:', error);
          setIsLoading(false);
          return;
        }

        if (!jobsData || jobsData.length === 0) {
          setJobs([]);
          setJobsWithMetrics([]);
          setIsLoading(false);
          return;
        }

        setJobs(jobsData);

        // Fetch message threads to count outreach per job
        const { data: threads, error: threadsError } = await getUserMessageThreads(user.uid);
        
        // Create maps for message-derived workflow counts by job
        const outreachCountMap = new Map<string, number>();
        const contactedCandidatesByJob = new Map<string, Set<string>>();
        
        if (!threadsError && threads && threads.length > 0) {
          // For each thread, check messages to see which job it's associated with
          for (const thread of threads) {
            try {
              const messagesQuery = query(
                collection(db, 'messages'),
                where('threadId', '==', thread.id),
                firestoreLimit(10)
              );
              
              const messagesSnapshot = await getDocs(messagesQuery);
              
              let threadHasRecruiterMessage = false;
              let threadJobId: string | null = null;
              for (const msgDoc of messagesSnapshot.docs) {
                const msgData = msgDoc.data();
                if (String(msgData?.senderId || '') === user.uid) {
                  threadHasRecruiterMessage = true;
                }
                if (msgData.jobDetails && msgData.jobDetails.jobId) {
                  threadJobId = String(msgData.jobDetails.jobId);
                }
              }
              if (!threadJobId) continue;
              outreachCountMap.set(threadJobId, (outreachCountMap.get(threadJobId) || 0) + 1);
              if (threadHasRecruiterMessage) {
                const otherParticipantId = Array.isArray((thread as any)?.participantIds)
                  ? ((thread as any).participantIds as string[]).find((id) => id !== user.uid)
                  : null;
                if (otherParticipantId) {
                  const existing = contactedCandidatesByJob.get(threadJobId) || new Set<string>();
                  existing.add(String(otherParticipantId));
                  contactedCandidatesByJob.set(threadJobId, existing);
                }
              }
            } catch (err) {
              console.warn('Error fetching messages for thread:', err);
            }
          }
        }

        // Combine jobs with outreach metrics
        const jobsWithMetricsData: JobWithMetrics[] = await Promise.all(
          jobsData.map(async (job: any) => {
            const { data: entries } = await getPipelineByJob(job.id);
            const normalizedEntries = (entries || []).map((entry: any) => ({
              ...entry,
              stage: normalizePipelineStage(entry.stage),
            }));
            const now = Date.now();
            const followUpDueCount = normalizedEntries.filter((entry: any) => {
              const raw = entry.nextFollowUpAt;
              if (!raw) return false;
              const d = raw?.toDate ? raw.toDate() : new Date(raw);
              return d.getTime() < now;
            }).length;
            const pipelineContactedCount = normalizedEntries.filter((entry: any) => entry.stage === 'CONTACTED').length;
            const contactedFromThreads = contactedCandidatesByJob.get(job.id)?.size || 0;
            const contactedCount = Math.max(pipelineContactedCount, contactedFromThreads);
            const shortlistCount = normalizedEntries.filter((entry: any) => entry.stage === 'SHORTLIST').length;

            const { data: matches } = await queryDocuments('jobMatches', [where('jobId', '==', job.id)]);
            const strongMatches = ((matches || []) as any[]).filter((m: any) => Number(m.overallScore || 0) >= 80);
            const pipelineCandidateIds = new Set(normalizedEntries.map((entry: any) => entry.candidateId));
            const newStrongMatchesCount = strongMatches.filter((m: any) => m.candidateId && !pipelineCandidateIds.has(m.candidateId)).length;

            return {
              ...job,
              outreachCount: outreachCountMap.get(job.id) || 0,
              pipelineCount: normalizedEntries.length,
              shortlistCount,
              contactedCount,
              followUpDueCount,
              newStrongMatchesCount,
            };
          })
        );

        setJobsWithMetrics(jobsWithMetricsData);
      } catch (err) {
        console.error('Error fetching jobs with metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobsWithMetrics();
  }, [user, profile?.companyId, profile?.isCompanyOwner, profile]);

  // Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobsWithMetrics.filter((job) => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt;
          const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt;
          return (bDate ? new Date(bDate).getTime() : 0) - (aDate ? new Date(aDate).getTime() : 0);
        case 'date-asc':
          const aDateAsc = a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt;
          const bDateAsc = b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt;
          return (aDateAsc ? new Date(aDateAsc).getTime() : 0) - (bDateAsc ? new Date(bDateAsc).getTime() : 0);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'outreach-desc':
          return b.outreachCount - a.outreachCount;
        case 'outreach-asc':
          return a.outreachCount - b.outreachCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [jobsWithMetrics, searchQuery, statusFilter, sortBy]);

  const displayedJobs = limit ? filteredAndSortedJobs.slice(0, limit) : filteredAndSortedJobs;
  const hasMore = limit ? filteredAndSortedJobs.length > limit : false;

  // Calculate stats
  const stats = useMemo(() => {
    const totalJobs = jobsWithMetrics.length;
    const activeJobs = jobsWithMetrics.filter(j => j.status === 'ACTIVE').length;
    const jobsWithOutreach = jobsWithMetrics.filter(j => j.outreachCount > 0).length;
    const totalOutreach = jobsWithMetrics.reduce((sum, j) => sum + j.outreachCount, 0);
    
    return { totalJobs, activeJobs, jobsWithOutreach, totalOutreach };
  }, [jobsWithMetrics]);

  const handleDeleteJob = async (jobId: string) => {
    if (confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      try {
        const { error } = await deleteDocument('jobs', jobId);
        if (error) {
          toast.error('Error', 'Failed to delete job. Please try again.');
          return;
        }
        
        // Remove the job from the local state
        setJobs(jobs.filter(job => job.id !== jobId));
        setJobsWithMetrics(jobsWithMetrics.filter(job => job.id !== jobId));
        toast.success('Success', 'Job deleted successfully!');
      } catch (err) {
        console.error('Error deleting job:', err);
        toast.error('Error', 'Failed to delete job. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-navy-800"></div>
        <p className="text-slate-600">Loading jobs...</p>
      </div>
    );
  }

  if (jobsWithMetrics.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <FileText className="h-10 w-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-navy-900">No jobs posted yet</h3>
        <p className="mx-auto mt-2 max-w-sm text-slate-600">Create your first job posting to start attracting candidates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview - Only show on full portfolio page */}
      {!limit && mode === "portfolio" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-sky-50 rounded-lg p-4 border border-sky-100">
            <div className="text-2xl font-bold text-navy-900">{stats.totalJobs}</div>
            <div className="text-sm text-slate-600">Total Jobs</div>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-4">
            <div className="text-2xl font-bold text-navy-900">{stats.activeJobs}</div>
            <div className="text-sm text-slate-600">Active Jobs</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-100 p-4">
            <div className="text-2xl font-bold text-navy-900">{stats.jobsWithOutreach}</div>
            <div className="text-sm text-slate-600">Jobs with Outreach</div>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
            <div className="text-2xl font-bold text-sky-900">{stats.totalOutreach}</div>
            <div className="text-sm text-slate-600">Total Outreach</div>
          </div>
        </div>
      )}

      {/* Search and Filters - Only show on full portfolio page */}
      {!limit && mode === "portfolio" && (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search jobs by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter and Sort */}
            <div className="flex flex-wrap gap-2">
              <Link
                href={getEmployerPoolsUrl()}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Talent pools
              </Link>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                  showFilters || statusFilter !== 'all' || sortBy !== 'date-desc'
                    ? 'bg-sky-100 border-sky-300 text-sky-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <div className="flex gap-2">
                  {(['all', 'ACTIVE', 'INACTIVE'] as StatusFilter[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        statusFilter === status
                          ? 'bg-navy-800 text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {status === 'all' ? 'All' : status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                  <option value="outreach-desc">Most Outreach</option>
                  <option value="outreach-asc">Least Outreach</option>
                </select>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="mt-3 text-sm text-slate-600">
            Showing {filteredAndSortedJobs.length} of {jobsWithMetrics.length} jobs
          </div>
        </div>
      )}

      {/* Jobs List */}
      {displayedJobs.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No jobs found</h3>
          <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedJobs.map((job) => {
            const lastRaw = (job as any).updatedAt ?? job.createdAt;
            const lastDate = lastRaw?.toDate ? lastRaw.toDate() : lastRaw ? new Date(lastRaw) : null;
            const lastActivityLabel =
              lastDate && !Number.isNaN(lastDate.getTime())
                ? `Last activity ${lastDate.toLocaleDateString()}`
                : null;
            return (
            <div 
              key={job.id} 
              className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h4 className="text-lg font-semibold text-navy-900">{job.title}</h4>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      job.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-slate-600 mb-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>{job.locationCity && job.locationState ? `${job.locationCity}, ${job.locationState}` : 'Remote'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>{job.employment || 'Not specified'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>
                        {job.salaryMin && job.salaryMax
                          ? `$${job.salaryMin.toLocaleString()} – $${job.salaryMax.toLocaleString()}`
                          : 'Salary not specified'}
                      </span>
                    </div>
                  </div>
                  {mode === "portfolio" && (
                    <p className="text-sm text-slate-600 line-clamp-1 mb-2">{job.description}</p>
                  )}
                  <p className="text-xs text-slate-600 mb-2">
                    <span className="font-semibold text-navy-900">{job.pipelineCount || 0}</span> in pipeline
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="font-semibold text-violet-800">{job.shortlistCount || 0}</span> on shortlist
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="font-semibold text-amber-800">{job.followUpDueCount || 0}</span> waiting on follow-up
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Posted {job.createdAt?.toDate ? new Date(job.createdAt.toDate()).toLocaleDateString() : job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '—'}
                    </span>
                    {lastActivityLabel && <span>{lastActivityLabel}</span>}
                    {mode === "portfolio" && job.outreachCount > 0 && (
                      <span className="text-slate-500">
                        Contacted-by-requisition view available from dashboard tools.
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 w-full lg:w-[240px] shrink-0 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-4">
                  <Link
                    href={getJobOverviewUrl(job.id)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-navy-800 text-white text-sm font-semibold hover:bg-navy-700"
                  >
                    Open workspace
                  </Link>
                  <div className="flex flex-col gap-2">
                    <Link
                      href={getJobPipelineUrl(job.id)}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-navy-900 hover:bg-slate-50"
                    >
                      <Workflow className="h-4 w-4" />
                      Pipeline
                    </Link>
                    <Link
                      href={getCandidatesSearchUrl(job.id)}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-navy-900 hover:bg-slate-50"
                    >
                      Source
                    </Link>
                  </div>
                  {mode === "portfolio" && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-2">
                      <Link href={getJobMatchesUrl(job.id)} className="hover:text-navy-900 font-medium">
                        Candidates
                      </Link>
                      <span className="text-slate-300">|</span>
                      <Link href={getJobCompareUrl(job.id)} className="hover:text-navy-900 font-medium">
                        Compare
                      </Link>
                      <span className="text-slate-300">|</span>
                      <Link href={`/employer/job/${job.id}/edit`} className="hover:text-navy-900 font-medium inline-flex items-center gap-1">
                        <Edit className="h-3 w-3" /> Edit
                      </Link>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteJob(job.id)}
                        className="text-rose-600 hover:text-rose-800 font-medium inline-flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="pt-2">
          <Link
            href="/employer/jobs"
            className="flex items-center justify-center gap-2 text-navy-800 font-semibold hover:text-navy-900 py-3 px-4 rounded-lg hover:bg-sky-50 transition-colors border border-slate-200 hover:border-sky-300"
          >
            <span>View All Jobs ({filteredAndSortedJobs.length})</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
