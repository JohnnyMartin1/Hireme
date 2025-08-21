"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

/**
 * Page for employers to edit their company profile. Provides a simple form
 * for updating company name, website, industry and description. Data is
 * loaded from and saved to API endpoints.
 */
export default function CompanyProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [about, setAbout] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCompany() {
      try {
        const res = await fetch('/api/employer/me');
        if (res.ok) {
          const data = await res.json();
          setCompanyName(data.companyName || '');
          setWebsite(data.website || '');
          setIndustry(data.industry || '');
          setAbout(data.about || '');
        }
      } catch {
        // ignore
      }
    }
    loadCompany();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/employer/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, website, industry, about }),
    });
    setLoading(false);
    if (res.ok) {
      alert('Company profile updated');
      router.push('/home/employer');
    } else {
      alert('Failed to update company profile');
    }
  };
  if (!session) {
    return <p>You must be signed in to view this page.</p>;
  }
  return (
    <div className="max-w-2xl mx-auto">
      <BackButton fallback="/home/employer" />
      <h2 className="text-2xl font-bold my-4">Edit Company Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="companyName">Company name</label>
          <input id="companyName" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="website">Website</label>
          <input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="industry">Industry</label>
          <input id="industry" type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="about">About</label>
          <textarea id="about" value={about} onChange={(e) => setAbout(e.target.value)} className="w-full px-3 py-2 border rounded h-24" />
        </div>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {loading ? 'Saving...' : 'Save company profile'}
        </button>
      </form>
    </div>
  );
}