"use client";
import { useState } from 'react';
import { useToast } from '@/components/NotificationSystem';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import BackButton from '@/components/BackButton';
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
    <div className="max-w-2xl mx-auto">
      <BackButton fallback="/home/employer" />
      <h2 className="text-2xl font-bold my-4">Post a Job</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="title">Job title</label>
          <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="description">Description</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded h-32" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="location">Location</label>
          <SearchableDropdown
            label=""
            options={LOCATIONS}
            value={location}
            onChange={setLocation}
            placeholder="Search for a city..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="employment">Job Type</label>
            <select id="employment" value={employment} onChange={(e) => setEmployment(e.target.value)} className="w-full px-3 py-2 border rounded">
              <option value="FULL_TIME">Full-time</option>
              <option value="PART_TIME">Part-time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="workMode">Work Mode</label>
            <select id="workMode" value={workMode} onChange={(e) => setWorkMode(e.target.value)} className="w-full px-3 py-2 border rounded">
              <option value="IN_PERSON">In-person</option>
              <option value="HYBRID">Hybrid</option>
              <option value="REMOTE">Remote</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="salaryMin">Salary min</label>
            <input id="salaryMin" type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="salaryMax">Salary max</label>
            <input id="salaryMax" type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="tags">Tags (comma separated)</label>
          <input id="tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>

        {/* Candidate Requirements */}
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Candidate Requirements</h3>
          <p className="text-sm text-gray-600 mb-4">Specify requirements for candidates. These will be used for filtering and matching.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="requiredGpa">Minimum GPA</label>
              <select 
                id="requiredGpa" 
                value={requiredGpa} 
                onChange={(e) => setRequiredGpa(e.target.value)} 
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">No GPA requirement</option>
                <option value="3.0">Above 3.0</option>
                <option value="3.3">Above 3.3</option>
                <option value="3.5">Above 3.5</option>
                <option value="3.7">Above 3.7</option>
                <option value="3.8">Above 3.8</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Required Career Interests</label>
              <MultiSelectDropdown
                options={CAREER_INTERESTS}
                values={requiredCareerInterests}
                onChange={setRequiredCareerInterests}
                placeholder="Select career interests"
                label=""
                allowCustom={false}
                maxSelections={5}
              />
              <p className="text-xs text-gray-500 mt-1">
                Select up to 5 career interests that candidates should have
              </p>
            </div>
          </div>
        </div>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {loading ? 'Posting...' : 'Post job'}
        </button>
      </form>
    </div>
  );
}