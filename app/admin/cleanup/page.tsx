"use client";
import { useState } from 'react';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function CleanupPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    // Only allow admin users
    if (profile && profile.role !== 'ADMIN') {
      router.push("/home");
      return;
    }
  }, [user, profile, loading, router]);

  const handleCleanup = async () => {
    if (!user) return;
    
    setIsCleaningUp(true);
    setError(null);
    setCleanupResult(null);
    
    try {
      // Get Firebase ID token
      const token = await user.getIdToken();
      
      // Call cleanup API
      const response = await fetch('/api/auth/cleanup-orphaned-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setCleanupResult(result);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to cleanup orphaned users');
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      setError('Failed to cleanup orphaned users. Please try again.');
    } finally {
      setIsCleaningUp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || profile?.role !== 'ADMIN') {
    return null; // Will redirect
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6 py-12">
        <Link 
          href="/admin"
          className="text-blue-600 hover:underline flex items-center space-x-1 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Admin</span>
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Cleanup Orphaned Users</h1>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-8 w-8 text-orange-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Database Cleanup</h2>
            </div>
            <p className="text-gray-600 mb-4">
              This tool will scan the Firestore database for user profiles that no longer exist in Firebase Authentication 
              and remove them. This helps maintain data consistency.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This action cannot be undone. Make sure you want to permanently delete orphaned user data.
              </p>
            </div>
          </div>

          <button
            onClick={handleCleanup}
            disabled={isCleaningUp}
            className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCleaningUp ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Cleaning up...
              </>
            ) : (
              <>
                <Trash2 className="h-5 w-5 mr-3" />
                Cleanup Orphaned Users
              </>
            )}
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {cleanupResult && (
            <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-4">Cleanup Complete</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-green-700 font-medium">Total Firestore Users:</p>
                  <p className="text-green-900 text-lg font-bold">{cleanupResult.stats.totalFirestoreUsers}</p>
                </div>
                <div>
                  <p className="text-green-700 font-medium">Valid Users:</p>
                  <p className="text-green-900 text-lg font-bold">{cleanupResult.stats.validUsers}</p>
                </div>
                <div>
                  <p className="text-green-700 font-medium">Orphaned Users:</p>
                  <p className="text-green-900 text-lg font-bold">{cleanupResult.stats.orphanedUsers}</p>
                </div>
                <div>
                  <p className="text-green-700 font-medium">Deleted Users:</p>
                  <p className="text-green-900 text-lg font-bold">{cleanupResult.stats.deletedUsers}</p>
                </div>
              </div>
              
              {cleanupResult.deletedUserIds && cleanupResult.deletedUserIds.length > 0 && (
                <div className="mt-4">
                  <p className="text-green-700 font-medium mb-2">Deleted User IDs:</p>
                  <div className="bg-white rounded-lg p-3 max-h-32 overflow-y-auto">
                    {cleanupResult.deletedUserIds.map((id: string, index: number) => (
                      <p key={index} className="text-xs text-gray-600 font-mono">{id}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
