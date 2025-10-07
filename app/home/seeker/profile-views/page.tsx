"use client";
import { useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { useRouter } from 'next/navigation';
import { getProfileViewers } from '@/lib/firebase-firestore';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ProfileViewersPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [viewers, setViewers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
      return;
    }
  }, [loading, user, router]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setIsLoading(true);
      const { viewers } = await getProfileViewers(user.uid);
      setViewers(viewers);
      setIsLoading(false);
    };
    load();
  }, [user]);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link 
            href="/home/seeker"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Companies that viewed your profile</h1>

        {isLoading ? (
          <div className="text-gray-600">Loading...</div>
        ) : viewers.length === 0 ? (
          <div className="text-gray-600">No companies have viewed your profile yet.</div>
        ) : (
          <div className="space-y-3">
            {viewers.map((v) => (
              <Link key={v.id} href={`/company/${v.id}`} className="block bg-white rounded-xl shadow p-4 hover:shadow-md transition">
                <div className="font-medium text-gray-900">{v.companyName || v.firstName || 'Company'}</div>
                {v.website && (
                  <div className="text-sm text-gray-600">{v.website}</div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}


