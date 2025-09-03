"use client";
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';

export default function TestFirebasePage() {
  const [status, setStatus] = useState('Loading...');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if Firebase is initialized
    if (auth) {
      setStatus('Firebase Auth is initialized');
      
      // Check current user
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          setUser(user);
          setStatus('User is signed in: ' + user.email);
        } else {
          setUser(null);
          setStatus('No user signed in');
        }
      });

      return () => unsubscribe();
    } else {
      setStatus('Firebase Auth is NOT initialized');
    }
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Firebase Test Page</h1>
      <div className="space-y-4">
        <div>
          <strong>Status:</strong> {status}
        </div>
        {user && (
          <div>
            <strong>User:</strong> {user.email}
          </div>
        )}
        <div>
          <strong>Auth Object:</strong> {auth ? 'Exists' : 'Missing'}
        </div>
      </div>
    </div>
  );
}
