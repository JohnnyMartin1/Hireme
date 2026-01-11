"use client";
import { useState, useEffect } from 'react';
import { useToast } from '@/components/NotificationSystem';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { ArrowLeft } from 'lucide-react';
import { createDocument } from '@/lib/firebase-firestore';
import { auth } from '@/lib/firebase';
import SearchableDropdown from '@/components/SearchableDropdown';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import { LOCATIONS, CAREER_INTERESTS } from '@/lib/profile-data';

/**
 * Job posting wizard. Simplified to a single form for creating a job.
 * Includes fields for title, description, location, employment type,
 * salary and tags. Sends data to API endpoint /api/job/create.
 */
export default function NewJobPage() {
  const toast = useToast();
  const router = useRouter();
  const { user, profile } = useFirebaseAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [employment, setEmployment] = useState('FULL_TIME');
  const [workMode, setWorkMode] = useState('IN_PERSON');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [tags, setTags] = useState('');
  const [requiredGpa, setRequiredGpa] = useState('');
  const [requiredCareerInterests, setRequiredCareerInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration issues
  if (!isMounted) {
    return null;
  }

  // Redirect if not logged in or not an employer/recruiter
  if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) {
    router.push('/auth/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Parse location (format: "City, State")
      const locationParts = location.split(',').map(s => s.trim());
      const locationCity = locationParts[0] || '';
      const locationState = locationParts[1] || '';

      // Prefer secure server-side creation with token verification
      const idToken = await auth.currentUser?.getIdToken();
      const jobData = {
        title,
        description,
        locationCity,
        locationState,
        employment,
        workMode,
        salaryMin: Number(salaryMin) || null,
        salaryMax: Number(salaryMax) || null,
        tags: tags.split(',').map((t) => t.trim()).filter(t => t),
        requiredGpa: requiredGpa || null,
        requiredCareerInterests: requiredCareerInterests,
        employerId: user.uid,
        companyId: profile?.companyId || null,
        companyName: profile?.companyName || null,
        companyWebsite: profile?.companyWebsite || null,
        status: 'ACTIVE'
      };

      const res = await fetch('/api/job/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...jobData,
          idToken
        })
      });

      if (!res.ok) {
        // Fallback to client-side write (requires Firestore rules permitting employer writes)
        const { error } = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.warn('Server create failed, attempting client fallback:', error);

        const { error: clientError } = await createDocument('jobs', jobData);

        if (clientError) {
          toast.error('Error', 'Failed to create job: ${clientError}');
          return;
        }
      }

      // Redirect to employer dashboard
      router.push('/home/employer');
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error('Error', 'Failed to create job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F8FAFC 100%)'}} className="min-h-screen mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full">
      <div className="w-full md:max-w-4xl md:mx-auto px-0 sm:px-3 md:px-6 lg:px-8 py-4 sm:py-6 md:py-10 min-w-0">
        {/* Breadcrumb */}
        <section className="mb-4 sm:mb-6 md:mb-8 px-2 sm:px-0">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/home/employer');
              }
            }}
            className="flex items-center text-navy-800 font-semibold hover:text-blue-900 transition-colors duration-200 bg-sky-200/10 hover:bg-sky-200/20 px-3 sm:px-4 py-2 rounded-full w-fit min-h-[44px] text-sm sm:text-base"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </button>
        </section>

        {/* Page Header */}
        <section className="mb-4 sm:mb-6 md:mb-10 px-2 sm:px-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-navy-800 break-words">Post a Job</h1>
        </section>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8">
          {/* Job Details Card */}
          <section className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 mb-3 sm:mb-0">
            <div className="space-y-6">
              {/* Job Title */}
              <div className="relative">
                <input 
                  id="title" 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="form-input w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 sm:focus:ring-4 focus:ring-navy/10 transition-all duration-200 min-h-[44px]" 
                  placeholder="e.g. Software Engineer" 
                  required 
                />
                <label htmlFor="title" className="absolute left-4 -top-2 text-sm text-navy-800 bg-white px-1">Job Title *</label>
              </div>

              {/* Description */}
              <div className="relative">
                <textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="form-input w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 sm:focus:ring-4 focus:ring-navy/10 transition-all duration-200 resize-none min-h-[120px]" 
                  rows={5}
                  placeholder="Describe the role, responsibilities, and what you're looking for..." 
                  required 
                />
                <label htmlFor="description" className="absolute left-4 -top-2 text-sm text-navy-800 bg-white px-1">Description *</label>
              </div>

              {/* Location */}
              <div className="relative">
                <SearchableDropdown
                  label="Location"
                  options={LOCATIONS}
                  value={location}
                  onChange={setLocation}
                  placeholder="Search for a city..."
                  required={true}
                />
              </div>

              {/* Job Type & Work Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <select 
                    id="employment" 
                    value={employment} 
                    onChange={(e) => setEmployment(e.target.value)} 
                    className="form-input w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-4 focus:ring-navy/10 transition-all duration-200 appearance-none" 
                    required
                  >
                    <option value="FULL_TIME">Full-time</option>
                    <option value="PART_TIME">Part-time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                  <label htmlFor="employment" className="absolute left-4 -top-2 text-sm text-navy-800 bg-white px-1">Job Type *</label>
                  <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-gray-400 pointer-events-none"></i>
                </div>

                <div className="relative">
                  <select 
                    id="workMode" 
                    value={workMode} 
                    onChange={(e) => setWorkMode(e.target.value)} 
                    className="form-input w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-4 focus:ring-navy/10 transition-all duration-200 appearance-none" 
                    required
                  >
                    <option value="IN_PERSON">In-person</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="REMOTE">Remote</option>
                  </select>
                  <label htmlFor="workMode" className="absolute left-4 -top-2 text-sm text-navy-800 bg-white px-1">Work Mode *</label>
                  <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-gray-400 pointer-events-none"></i>
                </div>
              </div>

              {/* Salary Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <input 
                    id="salaryMin" 
                    type="number" 
                    value={salaryMin} 
                    onChange={(e) => setSalaryMin(e.target.value)} 
                    className="form-input w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-4 focus:ring-navy/10 transition-all duration-200" 
                    placeholder="50000" 
                    min="0" 
                  />
                  <span className="absolute left-4 top-3 text-gray-500 pointer-events-none">$</span>
                  <label htmlFor="salaryMin" className="absolute left-12 -top-2 text-sm text-gray-600 bg-white px-1">Salary Min (optional)</label>
                </div>

                <div className="relative">
                  <input 
                    id="salaryMax" 
                    type="number" 
                    value={salaryMax} 
                    onChange={(e) => setSalaryMax(e.target.value)} 
                    className="form-input w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-4 focus:ring-navy/10 transition-all duration-200" 
                    placeholder="80000" 
                    min="0" 
                  />
                  <span className="absolute left-4 top-3 text-gray-500 pointer-events-none">$</span>
                  <label htmlFor="salaryMax" className="absolute left-12 -top-2 text-sm text-gray-600 bg-white px-1">Salary Max (optional)</label>
                </div>
              </div>

              {/* Tags */}
              <div className="relative">
                <input 
                  id="tags" 
                  type="text" 
                  value={tags} 
                  onChange={(e) => setTags(e.target.value)} 
                  className="form-input w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 sm:focus:ring-4 focus:ring-navy/10 transition-all duration-200 min-h-[44px]" 
                  placeholder="Enter tags separated by commas (e.g. React, JavaScript, Remote)" 
                />
                <label htmlFor="tags" className="absolute left-4 -top-2 text-sm text-gray-600 bg-white px-1">Tags</label>
              </div>
            </div>
          </section>

          {/* Candidate Requirements Card */}
          <section className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 mb-3 sm:mb-0">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-navy-800 mb-2">Candidate Requirements</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">These are used for filtering and matching.</p>

            <div className="space-y-6">
              {/* Minimum GPA */}
              <div className="relative">
                <select 
                  id="requiredGpa" 
                  value={requiredGpa} 
                  onChange={(e) => setRequiredGpa(e.target.value)} 
                  className="form-input w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-4 focus:ring-navy/10 transition-all duration-200 appearance-none"
                >
                  <option value="">No GPA requirement</option>
                  <option value="2.5">2.5+</option>
                  <option value="3.0">3.0+</option>
                  <option value="3.5">3.5+</option>
                  <option value="3.8">3.8+</option>
                </select>
                <label htmlFor="requiredGpa" className="absolute left-4 -top-2 text-sm text-gray-600 bg-white px-1">Minimum GPA</label>
                <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-gray-400 pointer-events-none"></i>
              </div>

              {/* Required Career Interests */}
              <div className="relative">
                <MultiSelectDropdown
                  options={CAREER_INTERESTS}
                  values={requiredCareerInterests}
                  onChange={setRequiredCareerInterests}
                  placeholder="Select career interests"
                  label={`Required Career Interests (${requiredCareerInterests.length}/5)`}
                  allowCustom={false}
                  maxSelections={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select up to 5 career interests that candidates should have
                </p>
              </div>
            </div>
          </section>

          {/* Form Actions */}
          <section className="pt-6">
            <button 
              type="submit" 
              disabled={loading} 
              className="bg-navy-800 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 md:px-8 rounded-lg hover:bg-blue-900 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 min-h-[44px] w-full sm:w-auto text-sm sm:text-base"
            >
              <span>{loading ? 'Posting...' : 'Post Job'}</span>
              <i className={`fa-solid ${loading ? 'fa-spinner animate-spin' : 'fa-plus'}`}></i>
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}