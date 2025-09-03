"use client";
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { getCurrentFirebaseUser } from '@/lib/firebase-auth';
import { getDocument } from '@/lib/firebase-firestore';

export default function FirebaseTest() {
  const [status, setStatus] = useState('Testing...');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function testFirebase() {
      try {
        // Test Firebase connection
        setStatus('Testing Firebase connection...');
        
        // Test Auth
        const currentUser = getCurrentFirebaseUser();
        setUser(currentUser);
        
        // Test Firestore (simple read)
        const testDoc = await getDocument('test', 'test');
        
        setStatus('Firebase is working! ✅');
      } catch (error: any) {
        setStatus(`Firebase error: ${error.message} ❌`);
        console.error('Firebase test error:', error);
      }
    }

    testFirebase();
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-semibold mb-2">Firebase Connection Test</h3>
      <p className="text-sm text-gray-600 mb-2">Status: {status}</p>
      {user && (
        <p className="text-sm text-gray-600">
          Current user: {user.email || 'No email'}
        </p>
      )}
    </div>
  );
}
