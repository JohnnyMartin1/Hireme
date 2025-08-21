"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

/**
 * Security settings page. Allows the user to change their password. This is
 * a simple example that posts the old and new password to an API route.
 */
export default function SecurityPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setLoading(false);
    if (res.ok) {
      alert('Password updated');
      router.push('/account/profile');
    } else {
      alert('Failed to change password');
    }
  };
  return (
    <div className="max-w-md mx-auto">
      <BackButton fallback="/account/profile" />
      <h2 className="text-2xl font-bold my-4">Security Settings</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="current">Current password</label>
          <input id="current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="new">New password</label>
          <input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  );
}