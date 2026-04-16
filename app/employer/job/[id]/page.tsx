"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { getDocument } from '@/lib/firebase-firestore';
import { Loader2, MapPin, Building, DollarSign, Calendar, Tag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getDashboardUrl, getJobMatchesUrl, getJobPipelineUrl } from '@/lib/navigation';

export default function ViewJobPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, profile, loading } = useFirebaseAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [job, setJob] = useState<any>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) {
      router.replace('/auth/login');
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) {
      setIsLoading(false);
      return;
    }

    const fetchJob = async () => {
      if (!params.id) return;
      
      setIsLoading(true);
      try {
        const { data: jobData, error } = await getDocument('jobs', params.id);
        if (error) {
          setError('Failed to load job');
          return;
        }
        
        if (!jobData) {
          setError('Job not found');
          return;
        }

        const j = jobData as any;
        const sameEmployer = j.employerId === user.uid;
        const sameCompany =
          j.companyId &&
          profile?.companyId &&
          j.companyId === profile.companyId &&
          (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER');
        if (!sameEmployer && !sameCompany) {
          setError('You can only view your own jobs');
          return;
        }

        setJob({ ...j, id: params.id });
      } catch (err) {
        console.error('Error fetching job:', err);
        setError('Failed to load job');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [params.id, user, profile, loading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Job not found'}</p>
          <Link
            href="/home/employer"
            className="inline-flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/employer/jobs"
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium text-sm sm:text-base hidden sm:inline">Back to Jobs</span>
            <span className="font-medium text-sm sm:text-base sm:hidden">Back</span>
          </Link>
          <Link href="/" className="shrink-0" aria-label="HireMe home">
            <img src="/logo.svg" alt="HireMe logo" className="h-7 sm:h-8 w-auto" role="img" aria-label="HireMe logo" />
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
          <p className="text-gray-600">Job Details</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Job Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">{job.title}</h2>
              <span className={`px-3 py-1 text-sm rounded-full ${
                job.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {job.status}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center text-gray-600">
                <MapPin className="h-5 w-5 mr-2" />
                <span>
                  {job.locationCity && job.locationState 
                    ? `${job.locationCity}, ${job.locationState}` 
                    : 'Remote'
                  }
                </span>
              </div>
              <div className="flex items-center text-gray-600">
                <Building className="h-5 w-5 mr-2" />
                <span>{job.employment}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <DollarSign className="h-5 w-5 mr-2" />
                <span>
                  {job.salaryMin && job.salaryMax 
                    ? `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
                    : 'Salary not specified'
                  }
                </span>
              </div>
            </div>

            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently'}</span>
              {job.updatedAt && (
                <span className="ml-4">
                  • Updated {new Date(job.updatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
            </div>
          </div>

          {/* Tags */}
          {job.tags && job.tags.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Tag className="h-5 w-5 mr-2" />
                Skills & Technologies
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push(getJobMatchesUrl(params.id))}
              className="px-6 py-3 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors"
            >
              Top Matches
            </button>
            <button
              type="button"
              onClick={() => router.push(getJobPipelineUrl(params.id))}
              className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              Pipeline
            </button>
            <button
              type="button"
              onClick={() => router.push(`/employer/job/${params.id}/edit`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Job
            </button>
            <button
              type="button"
              onClick={() => router.push(getDashboardUrl())}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
