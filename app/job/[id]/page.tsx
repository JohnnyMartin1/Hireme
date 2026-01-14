"use client";
import { useParams } from 'next/navigation';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="min-h-screen bg-gradient-to-b from-[#F0F8FF] to-[#E6F0FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#000080] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F0F8FF] to-[#E6F0FF] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => router.back()}
            className="text-[#000080] hover:text-[#ADD8E6] underline font-medium"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F0F8FF] to-[#E6F0FF] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Job not found</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full bg-gradient-to-b from-[#F0F8FF] to-[#E6F0FF] py-4 sm:py-6 md:py-12 px-4 sm:px-6 md:px-8">
        <div className="w-full max-w-4xl mx-auto min-w-0">
          
          {/* Page Header */}
          <header className="mb-4 sm:mb-6 md:mb-8 w-full">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-[#000080] font-semibold hover:text-blue-900 transition-all duration-300 bg-[#ADD8E6]/10 hover:bg-[#ADD8E6]/30 hover:shadow-md hover:scale-105 px-3 sm:px-4 py-2 rounded-full group mb-3 sm:mb-4 min-h-[44px] text-sm sm:text-base"
            >
              <i className="fa-solid fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform duration-300"></i>
              <span className="hidden sm:inline">Back to Messages</span>
              <span className="sm:hidden">Back</span>
            </button>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#000080] mt-3 sm:mt-4 break-words">{job.title}</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Job Details</p>
          </header>

          {/* Job Details Card */}
          <div className="w-full min-w-0 bg-white rounded-none sm:rounded-xl md:rounded-2xl shadow-lg overflow-hidden">
            <div className="p-4 sm:p-6 md:p-8 lg:p-10 space-y-4 sm:space-y-6 md:space-y-8">
              
              {/* Job Summary */}
              <section className="flex flex-col md:flex-row items-start justify-between gap-6">
                <div className="flex-grow">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#000080] break-words">{job.title}</h2>
                  
                  {/* Company Name and Website */}
                  {(job.companyName || job.companyWebsite || job.website) && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-700">
                      {job.companyName && (
                        <div className="flex items-center gap-2">
                          <i className="fa-solid fa-building text-gray-400"></i>
                          <span className="font-medium">{job.companyName}</span>
                        </div>
                      )}
                      {(job.companyWebsite || job.website) && (
                        <div className="flex items-center gap-2">
                          <i className="fa-solid fa-globe text-gray-400"></i>
                          <a 
                            href={job.companyWebsite || job.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#000080] hover:text-[#ADD8E6] underline transition-colors"
                          >
                            {(job.companyWebsite || job.website)?.replace(/^https?:\/\/(www\.)?/, '')}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-col md:flex-row md:items-center gap-x-6 gap-y-2 text-gray-600">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-location-dot text-gray-400"></i>
                      <span>{formatLocation()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-briefcase text-gray-400"></i>
                      <span>{job.employment || job.type || 'Full-time'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <i className="fa-regular fa-calendar text-gray-400"></i>
                      <span>Posted {formatDate(job.postedDate)}</span>
                      {job.updatedDate && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>Updated {formatDate(job.updatedDate)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                  <p className="text-lg font-semibold text-[#000080]">{formatSalary()}</p>
                  {job.status && (
                    <div className="inline-flex items-center gap-2 bg-[#E6F9F0] text-[#0A7B44] px-3 py-1 rounded-full text-sm font-medium">
                      <i className="fa-solid fa-check"></i>
                      <span>{job.status.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </section>
              
              {/* Job Description */}
              <section>
                <h3 className="text-xl font-semibold text-[#000080] mb-3">Job Description</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-700 leading-relaxed">
                  <p>{job.description}</p>
                </div>
              </section>
              
              {/* Skills & Technologies */}
              {job.skills && job.skills.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold text-[#000080] mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-tag text-gray-400"></i>
                    Skills & Technologies
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {job.skills.map((skill, index) => (
                      <span key={index} className="bg-[#C2E3FF] text-[#000080] font-medium px-4 py-2 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Requirements */}
              {job.requirements && job.requirements.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold text-[#000080] mb-3">Requirements</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    {job.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Responsibilities */}
              {job.responsibilities && job.responsibilities.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold text-[#000080] mb-3">Responsibilities</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    {job.responsibilities.map((resp, index) => (
                      <li key={index}>{resp}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Benefits */}
              {job.benefits && job.benefits.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold text-[#000080] mb-3">Benefits</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
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