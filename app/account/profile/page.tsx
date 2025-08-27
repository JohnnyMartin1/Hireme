"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

/**
 * Profile editing page for job seekers. Allows the user to update their
 * personal details, skills, resume and video. This is a simplified
 * client-side implementation; in a real app you would fetch the current
 * profile on the server and handle validation and uploads.
 */
export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [headline, setHeadline] = useState('');
  const [skills, setSkills] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch current profile using API route if desired
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile/me');
        if (res.ok) {
          const data = await res.json();
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setHeadline(data.headline || '');
          setSkills((data.skills || []).join(', '));
        }
      } catch {
        // ignore
      }
    }
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, headline, skills: skills.split(',').map((s) => s.trim()) }),
    });
    setLoading(false);
    if (res.ok) {
      alert('Profile updated');
      router.push('/home/seeker');
    } else {
      alert('Failed to update profile');
    }
  };
  if (!session) {
    return <p>You must be signed in to view this page.</p>;
  }
  return (
    <div className="max-w-2xl mx-auto">
      <BackButton fallback="/home/seeker" />
      <h2 className="text-2xl font-bold my-4">Edit Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="firstName">First name</label>
          <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="lastName">Last name</label>
          <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="headline">Headline</label>
          <input id="headline" type="text" value={headline} onChange={(e) => setHeadline(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="skills">Skills (comma separated)</label>
          <input id="skills" type="text" value={skills} onChange={(e) => setSkills(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {loading ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}