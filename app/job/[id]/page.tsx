"use client";
import { useParams } from 'next/navigation';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building, MapPin, DollarSign, Calendar, Clock, User, MessageSquare } from "lucide-react";
import { getDocument } from '@/lib/firebase-firestore';
import type { Job } from '@/types/job';

export default function JobDetailPage() {
  const params = useParams();
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
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
        console.log('Fetching job details for ID:', params.id);
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
        
        console.log('Fetched job data:', data);
        setJob(data as Job);
      } catch (err) {
        console.error('Error in fetchJobDetails:', err);
        setError('Failed to load job details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetails();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Job not found</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center text-gray-600">
                  <Building className="h-5 w-5 mr-2" />
                  <span>Company Details</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>
                    {job.locationCity && job.locationState 
                      ? `${job.locationCity}, ${job.locationState}` 
                      : 'Remote'
                    }
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center text-gray-600">
                  <DollarSign className="h-5 w-5 mr-2" />
                  <span>
                    {job.salaryMin && job.salaryMax 
                      ? `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
                      : 'Salary not specified'
                    }
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span>{job.employment || 'Full Time'}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="h-5 w-5 mr-2" />
                  <span>Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 ml-4">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <User className="h-5 w-5 mr-2" />
                Apply Now
              </button>
              <button className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Contact Company
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
          <p className="text-gray-700 leading-relaxed">{job.description}</p>
        </div>

        {/* Skills & Technologies */}
        {job.tags && job.tags.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills & Technologies</h2>
            <div className="flex flex-wrap gap-2">
              {job.tags.map((tag, index) => (
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

        {/* Apply Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Ready to Apply?</h2>
          <p className="text-gray-600 mb-6">
            This is an exciting opportunity to join a dynamic team and grow your career.
          </p>
          <div className="flex gap-4">
            <button className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Apply Now
            </button>
            <button className="flex-1 px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
              Save Job
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}