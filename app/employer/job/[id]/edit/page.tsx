"use client";
import { useState, useEffect } from 'react';
import { useToast } from '@/components/NotificationSystem';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { getDocument, updateDocument } from '@/lib/firebase-firestore';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import SearchableDropdown from '@/components/SearchableDropdown';
import { LOCATIONS } from '@/lib/profile-data';

export default function EditJobPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, profile } = useFirebaseAuth();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [employment, setEmployment] = useState('FULL_TIME');
  const [workMode, setWorkMode] = useState('IN_PERSON');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [tags, setTags] = useState('');

  // Redirect if not logged in or not an employer/recruiter
  if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) {
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
          setError('You can only edit your own jobs');
          return;
        }

        // Populate form with existing data
        const job = jobData as any;
        setTitle(job.title || '');
        setDescription(job.description || '');
        // Combine city and state into location string
        const locationStr = [job.locationCity, job.locationState]
          .filter(Boolean)
          .join(', ');
        setLocation(locationStr);
        setEmployment(job.employment || 'FULL_TIME');
        setWorkMode(job.workMode || 'IN_PERSON');
        setSalaryMin(job.salaryMin ? job.salaryMin.toString() : '');
        setSalaryMax(job.salaryMax ? job.salaryMax.toString() : '');
        setTags(job.tags ? job.tags.join(', ') : '');
      } catch (err) {
        console.error('Error fetching job:', err);
        setError('Failed to load job');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [params.id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    
    try {
      // Parse location (format: "City, State")
      const locationParts = location.split(',').map(s => s.trim());
      const locationCity = locationParts[0] || '';
      const locationState = locationParts[1] || '';

      const jobData = {
        title: title.trim(),
        description: description.trim(),
        locationCity: locationCity,
        locationState: locationState,
        employment,
        workMode,
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        updatedAt: new Date()
      };

      const { error: updateError } = await updateDocument('jobs', params.id, jobData);
      
      if (updateError) {
        setError('Failed to update job');
        return;
      }

      toast.success('Success', 'Job updated successfully!');
      router.push('/home/employer');
    } catch (error) {
      console.error('Error updating job:', error);
      setError('Failed to update job. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <BackButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href={`/employer/job/${params.id}`}
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium text-sm sm:text-base hidden sm:inline">Back to Job</span>
            <span className="font-medium text-sm sm:text-base sm:hidden">Back</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 269 274" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M111.028 0C172.347 0.000238791 222.055 51.647 222.055 115.356C222.055 140.617 214.238 163.98 200.983 182.981L258.517 242.758L238.036 264.036L181.077 204.857C161.97 221.02 137.589 230.713 111.028 230.713C49.7092 230.713 2.76862e-05 179.066 0 115.356C0 51.6468 49.7092 0 111.028 0Z" fill="white"/>
                <path d="M205.69 115.392C205.69 170.42 163.308 215.029 111.028 215.029C58.748 215.029 16.3666 170.42 16.3666 115.392C16.3666 60.3646 58.748 15.7559 111.028 15.7559C163.308 15.7559 205.69 60.3646 205.69 115.392Z" fill="#4F86F7"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-navy-900">HireMe</span>
          </Link>
        </div>
      </header>

      <div className="w-full md:max-w-4xl md:mx-auto px-4 sm:px-6 md:p-6 py-4 sm:py-6 min-w-0">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 break-words">Edit Job</h1>
          <p className="text-sm sm:text-base text-gray-600 break-words">Update your job posting details</p>
        </div>

        <div className="w-full min-w-0 bg-white rounded-none sm:rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Job Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Job Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                placeholder="e.g., Senior Software Engineer"
                required
              />
            </div>

            {/* Job Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[120px]"
                placeholder="Describe the role, responsibilities, and requirements..."
                required
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <SearchableDropdown
                label=""
                options={LOCATIONS}
                value={location}
                onChange={setLocation}
                placeholder="Search for a city..."
              />
            </div>

            {/* Job Type and Work Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="employment" className="block text-sm font-medium text-gray-700 mb-2">
                  Job Type
                </label>
                <select
                  id="employment"
                  value={employment}
                  onChange={(e) => setEmployment(e.target.value)}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                >
                  <option value="FULL_TIME">Full-time</option>
                  <option value="PART_TIME">Part-time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
              </div>
              <div>
                <label htmlFor="workMode" className="block text-sm font-medium text-gray-700 mb-2">
                  Work Mode
                </label>
                <select
                  id="workMode"
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                >
                  <option value="IN_PERSON">In-person</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="REMOTE">Remote</option>
                </select>
              </div>
            </div>

            {/* Salary Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="salaryMin" className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Salary ($)
                </label>
                <input
                  type="number"
                  id="salaryMin"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                  placeholder="e.g., 80000"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="salaryMax" className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Salary ($)
                </label>
                <input
                  type="number"
                  id="salaryMax"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                  placeholder="e.g., 120000"
                  min="0"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                placeholder="e.g., React, TypeScript, Node.js"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/home/employer')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !title.trim() || !description.trim()}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating Job...
                  </>
                ) : (
                  'Update Job'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}