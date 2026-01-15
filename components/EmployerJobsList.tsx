"use client";
import Link from "next/link";
import { useToast } from '@/components/NotificationSystem';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useEffect, useState, useMemo } from "react";
import { 
  Building,
  Edit,
  Eye,
  Trash2,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  ArrowRight,
  Search,
  Filter,
  Users,
  MessageSquare,
  ChevronDown,
  SortAsc,
  X
} from "lucide-react";
import { getEmployerJobs, getUserMessageThreads } from '@/lib/firebase-firestore';
import { deleteDocument } from '@/lib/firebase-firestore';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit as firestoreLimit } from 'firebase/firestore';

interface EmployerJobsListProps {
  limit?: number;
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
}

type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'outreach-desc' | 'outreach-asc';
type StatusFilter = 'all' | 'ACTIVE' | 'INACTIVE';

export default function EmployerJobsList({ limit }: EmployerJobsListProps) {
  const toast = useToast();
  const { user } = useFirebaseAuth();
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
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Fetch jobs
        const { data: jobsData, error } = await getEmployerJobs(user.uid);
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
        
        // Create a map to count outreach per job
        const outreachCountMap = new Map<string, number>();
        
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
              
              for (const msgDoc of messagesSnapshot.docs) {
                const msgData = msgDoc.data();
                if (msgData.jobDetails && msgData.jobDetails.jobId) {
                  const jobId = msgData.jobDetails.jobId;
                  outreachCountMap.set(jobId, (outreachCountMap.get(jobId) || 0) + 1);
                  break; // Only count once per thread
                }
              }
            } catch (err) {
              console.warn('Error fetching messages for thread:', err);
            }
          }
        }

        // Combine jobs with outreach metrics
        const jobsWithMetricsData: JobWithMetrics[] = jobsData.map((job: any) => ({
          ...job,
          outreachCount: outreachCountMap.get(job.id) || 0
        }));

        setJobsWithMetrics(jobsWithMetricsData);
      } catch (err) {
        console.error('Error fetching jobs with metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobsWithMetrics();
  }, [user]);

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading jobs...</p>
      </div>
    );
  }

  if (jobsWithMetrics.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <FileText className="h-10 w-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-700">No jobs posted yet</h3>
        <p className="text-gray-500 mt-2 max-w-sm mx-auto">Create your first job posting to start attracting candidates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview - Only show on full page (no limit) */}
      {!limit && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-sky-50 rounded-lg p-4 border border-sky-100">
            <div className="text-2xl font-bold text-navy-900">{stats.totalJobs}</div>
            <div className="text-sm text-slate-600">Total Jobs</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="text-2xl font-bold text-green-700">{stats.activeJobs}</div>
            <div className="text-sm text-slate-600">Active Jobs</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="text-2xl font-bold text-purple-700">{stats.jobsWithOutreach}</div>
            <div className="text-sm text-slate-600">Jobs with Outreach</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="text-2xl font-bold text-blue-700">{stats.totalOutreach}</div>
            <div className="text-sm text-slate-600">Total Outreach</div>
          </div>
        </div>
      )}

      {/* Search and Filters - Only show on full page (no limit) */}
      {!limit && (
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
            <div className="flex gap-2">
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
          {displayedJobs.map((job) => (
            <div 
              key={job.id} 
              className={`border rounded-lg p-4 hover:shadow-md transition-all ${
                job.outreachCount > 0 
                  ? 'border-sky-200 bg-sky-50/30' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h4 className="text-lg font-semibold text-gray-900">{job.title}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      job.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status}
                    </span>
                    {job.outreachCount > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-medium">
                        <MessageSquare className="h-3 w-3" />
                        <span>{job.outreachCount} outreach{job.outreachCount !== 1 ? 'es' : ''}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{job.locationCity && job.locationState ? `${job.locationCity}, ${job.locationState}` : 'Remote'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{job.employment || 'Not specified'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>
                        {job.salaryMin && job.salaryMax 
                          ? `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
                          : 'Salary not specified'
                        }
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {job.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>Posted {job.createdAt?.toDate ? new Date(job.createdAt.toDate()).toLocaleDateString() : job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently'}</span>
                    </div>
                    {job.outreachCount > 0 && (
                      <Link 
                        href="/employer/candidates-by-job"
                        className="flex items-center text-sky-600 hover:text-sky-700 hover:underline"
                        title="View all candidates by job"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        <span>View candidates</span>
                      </Link>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/employer/job/${job.id}/edit`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Job"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/employer/job/${job.id}`}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="View Job"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Job"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
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
