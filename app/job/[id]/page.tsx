"use client";
import { useParams, useSearchParams } from 'next/navigation';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { getDocument } from '@/lib/firebase-firestore';

interface JobDetail {
  id: string;
  title: string;
  companyName?: string;
  companyWebsite?: string;
  website?: string;
  location: string;
  locationCity?: string;
  locationState?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  type: string;
  employment?: string;
  description: string;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  skills?: string[];
  postedDate: string;
  updatedDate?: string;
  status?: string;
}

export default function JobDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get threadId from query parameter if coming from a message thread
  const threadId = searchParams.get('thread');

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!params.id) return;
      
      setIsLoading(true);
      try {
        const { data, error: fetchError } = await getDocument('jobs', params.id as string);
        
        if (fetchError) {
          console.error('Error fetching job:', fetchError);
          setError(fetchError);
          return;
        }
        
        if (!data) {
          setError('Job not found');
          return;
        }
        
        setJob(data as JobDetail);
      } catch (err) {
        console.error('Error in fetchJobDetails:', err);
        setError('Failed to load job details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetails();
  }, [params.id]);

  // Helper functions
  const formatSalary = () => {
    if (job?.salaryMin && job?.salaryMax) {
      return `$${job.salaryMin.toLocaleString()} – $${job.salaryMax.toLocaleString()}`;
    }
    return job?.salary || 'Not specified';
  };

  const formatLocation = () => {
    if (job?.locationCity && job?.locationState) {
      return `${job.locationCity}, ${job.locationState}`;
    }
    return job?.location || 'Not specified';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading || isLoading) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => router.back()}
            className="text-navy-800 hover:text-navy-700 underline font-medium"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Job not found</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full bg-slate-50 pt-12 sm:pt-16 md:pt-20 pb-8 sm:pb-10 md:pb-12">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Page Header */}
          <header className="mb-6 sm:mb-8 md:mb-10 w-full">
            <button
              onClick={() => {
                // If threadId exists, navigate to the specific thread, otherwise go back
                if (threadId) {
                  router.push(`/messages/candidate?thread=${threadId}`);
                } else {
                  router.push('/messages/candidate');
                }
              }}
              className="inline-flex items-center text-navy-800 font-semibold hover:text-navy-900 transition-all duration-200 bg-sky-200/10 hover:bg-sky-200/20 px-3 sm:px-4 py-2 rounded-full group mb-4 min-h-[44px] text-sm sm:text-base hover:shadow-md hover:scale-105"
            >
              <i className="fa-solid fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform duration-200"></i>
              <span className="hidden sm:inline">Back to Messages</span>
              <span className="sm:hidden">Back</span>
            </button>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-navy-900 mb-2 break-words">{job.title}</h1>
            <p className="text-base sm:text-lg text-slate-600">Job Details</p>
          </header>

          {/* Job Details Card */}
          <div className="w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-10 space-y-6 sm:space-y-8">
              
              {/* Job Summary */}
              <section className="flex flex-col md:flex-row items-start justify-between gap-6">
                <div className="flex-grow">
                  <h2 className="text-xl sm:text-2xl font-bold text-navy-900 break-words">{job.title}</h2>
                  
                  {/* Company Name and Website */}
                  {(job.companyName || job.companyWebsite || job.website) && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-700">
                      {job.companyName && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                            <i className="fa-solid fa-building text-navy-700 text-sm"></i>
                          </div>
                          <span className="font-medium text-slate-900">{job.companyName}</span>
                        </div>
                      )}
                      {(job.companyWebsite || job.website) && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                            <i className="fa-solid fa-globe text-navy-700 text-sm"></i>
                          </div>
                          <a 
                            href={job.companyWebsite || job.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-navy-800 hover:text-navy-700 underline transition-colors"
                          >
                            {(job.companyWebsite || job.website)?.replace(/^https?:\/\/(www\.)?/, '')}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-col md:flex-row md:items-center gap-x-6 gap-y-3 text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                        <i className="fa-solid fa-location-dot text-navy-700 text-sm"></i>
                      </div>
                      <span>{formatLocation()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                        <i className="fa-solid fa-briefcase text-navy-700 text-sm"></i>
                      </div>
                      <span>{job.employment || job.type || 'Full-time'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                        <i className="fa-regular fa-calendar text-navy-700 text-sm"></i>
                      </div>
                      <span>Posted {formatDate(job.postedDate)}</span>
                      {job.updatedDate && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>Updated {formatDate(job.updatedDate)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
                  <p className="text-lg font-semibold text-navy-900">{formatSalary()}</p>
                  {job.status && (
                    <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-3 py-1.5 rounded-full text-sm font-medium">
                      <i className="fa-solid fa-check"></i>
                      <span>{job.status.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </section>
              
              {/* Job Description */}
              <section>
                <h3 className="text-xl font-bold text-navy-900 mb-4">Job Description</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-slate-700 leading-relaxed">
                  <p className="whitespace-pre-wrap">{job.description}</p>
                </div>
              </section>
              
              {/* Skills & Technologies */}
              {job.skills && job.skills.length > 0 && (
                <section>
                  <h3 className="text-xl font-bold text-navy-900 mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                      <i className="fa-solid fa-tag text-navy-700"></i>
                    </div>
                    Skills & Technologies
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {job.skills.map((skill, index) => (
                      <span key={index} className="bg-sky-100 text-navy-800 font-medium px-4 py-2 rounded-full text-sm border border-sky-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Requirements */}
              {job.requirements && job.requirements.length > 0 && (
                <section>
                  <h3 className="text-xl font-bold text-navy-900 mb-4">Requirements</h3>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-6 leading-relaxed">
                    {job.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Responsibilities */}
              {job.responsibilities && job.responsibilities.length > 0 && (
                <section>
                  <h3 className="text-xl font-bold text-navy-900 mb-4">Responsibilities</h3>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-6 leading-relaxed">
                    {job.responsibilities.map((resp, index) => (
                      <li key={index}>{resp}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Benefits */}
              {job.benefits && job.benefits.length > 0 && (
                <section>
                  <h3 className="text-xl font-bold text-navy-900 mb-4">Benefits</h3>
                  <ul className="list-disc list-inside text-slate-700 space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-6 leading-relaxed">
                    {job.benefits.map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                </section>
              )}

            </div>
          </div>
        </div>
      </main>
  );
}