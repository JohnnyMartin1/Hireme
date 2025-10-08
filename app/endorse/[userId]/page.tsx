"use client";
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createEndorsement } from '@/lib/firebase-firestore';
import { ArrowLeft } from 'lucide-react';

export default function EndorseFormPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  const [endorserName, setEndorserName] = useState('');
  const [endorserEmail, setEndorserEmail] = useState('');
  const [skill, setSkill] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const { id, error } = await createEndorsement(userId, {
      endorserName,
      endorserEmail,
      skill,
      message
    });
    setSubmitting(false);
    if (error) {
      setError('Failed to submit endorsement. Please try again.');
      return;
    }
    setSuccess('Thank you! Your endorsement has been submitted.');
    setEndorserName('');
    setEndorserEmail('');
    setSkill('');
    setMessage('');
  };

  if (!userId) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-xl mx-auto p-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:underline flex items-center space-x-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Endorse a Skill</h1>
        <p className="text-gray-600 mb-6">Use this form to vouch for this candidate's skills.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
          {success && <div className="p-3 bg-green-50 text-green-700 rounded">{success}</div>}
          {error && <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input value={endorserName} onChange={(e)=>setEndorserName(e.target.value)} required className="w-full p-3 border rounded" placeholder="Jane Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Email (optional)</label>
            <input value={endorserEmail} onChange={(e)=>setEndorserEmail(e.target.value)} type="email" className="w-full p-3 border rounded" placeholder="jane@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skill</label>
            <input value={skill} onChange={(e)=>setSkill(e.target.value)} required className="w-full p-3 border rounded" placeholder="e.g., Python" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
            <textarea value={message} onChange={(e)=>setMessage(e.target.value)} className="w-full p-3 border rounded min-h-[120px]" placeholder="Share how they demonstrated this skill" />
          </div>

          <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit Endorsement'}
          </button>
        </form>
      </div>
    </main>
  );
}


