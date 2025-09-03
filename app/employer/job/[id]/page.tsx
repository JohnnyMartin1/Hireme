"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { getDocument } from '@/lib/firebase-firestore';
import BackButton from '@/components/BackButton';
import { Loader2, MapPin, Building, DollarSign, Calendar, Tag } from 'lucide-react';

export default function ViewJobPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, profile } = useFirebaseAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [job, setJob] = useState<any>(null);

  // Redirect if not logged in or not an employer
  if (!user || !profile || profile.role !== 'EMPLOYER') {
    router.push('/auth/login');
    return null;
  }

  useEffect(() => {
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

        // Check if the job belongs to the current user
        if ((jobData as any).employerId !== user.uid) {
          setError('You can only view your own jobs');
          return;
        }

        setJob(jobData);
      } catch (err) {
        console.error('Error fetching job:', err);
        setError('Failed to load job');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [params.id, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <BackButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <BackButton />
          <h1 className="text-3xl font-bold text-gray-900 mt-4">{job.title}</h1>
          <p className="text-gray-600 mt-2">Job Details</p>
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
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              onClick={() => router.push(`/employer/job/${job.id}/edit`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Job
            </button>
            <button
              onClick={() => router.push('/home/employer')}
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
