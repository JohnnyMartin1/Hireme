"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

/**
 * Job posting wizard. Simplified to a single form for creating a job.
 * Includes fields for title, description, location, employment type,
 * salary and tags. Sends data to API endpoint /api/job/create.
 */
export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [employment, setEmployment] = useState('FULL_TIME');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/job/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, locationCity, locationState, employment, salaryMin: Number(salaryMin) || null, salaryMax: Number(salaryMax) || null, tags: tags.split(',').map((t) => t.trim()) }),
    });
    setLoading(false);
    if (res.ok) {
      alert('Job created');
      router.push('/home/employer');
    } else {
      alert('Failed to create job');
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="city">City</label>
            <input id="city" type="text" value={locationCity} onChange={(e) => setLocationCity(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="state">State</label>
            <input id="state" type="text" value={locationState} onChange={(e) => setLocationState(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="employment">Employment type</label>
          <select id="employment" value={employment} onChange={(e) => setEmployment(e.target.value)} className="w-full px-3 py-2 border rounded">
            <option value="INTERNSHIP">Internship</option>
            <option value="PART_TIME">Part-time</option>
            <option value="FULL_TIME">Full-time</option>
            <option value="CONTRACT">Contract</option>
          </select>
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
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {loading ? 'Posting...' : 'Post job'}
        </button>
      </form>
    </div>
  );
}