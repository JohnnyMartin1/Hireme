"use client";
import Link from "next/link";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useEffect, useState } from "react";
import { 
  Building,
  Edit,
  Eye,
  Trash2,
  Calendar,
  MapPin,
  DollarSign
} from "lucide-react";
import { getEmployerJobs } from '@/lib/firebase-firestore';
import { deleteDocument } from '@/lib/firebase-firestore';

export default function EmployerJobsList() {
  const { user } = useFirebaseAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data: jobsData, error } = await getEmployerJobs(user.uid);
        if (!error && jobsData) {
          setJobs(jobsData);
        }
      } catch (err) {
        console.error('Error fetching jobs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, [user]);

  const handleDeleteJob = async (jobId: string) => {
    if (confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      try {
        const { error } = await deleteDocument('jobs', jobId);
        if (error) {
          alert('Failed to delete job. Please try again.');
          return;
        }
        
        // Remove the job from the local state
        setJobs(jobs.filter(job => job.id !== jobId));
        alert('Job deleted successfully!');
      } catch (err) {
        console.error('Error deleting job:', err);
        alert('Failed to delete job. Please try again.');
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

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">No jobs posted yet</p>
        <p className="text-sm text-gray-400">Create your first job posting to start attracting candidates</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-lg font-semibold text-gray-900">{job.title}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  job.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {job.status}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{job.locationCity && job.locationState ? `${job.locationCity}, ${job.locationState}` : 'Remote'}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Building className="h-4 w-4 mr-2" />
                  <span>{job.employment}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
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
              
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="h-3 w-3 mr-1" />
                <span>Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently'}</span>
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
  );
}
