"use client";
import { useEffect, useState } from 'react';
import { testFirebaseConnection } from '@/lib/firebase-debug';
import { getDocument } from '@/lib/firebase-firestore';

export default function DebugFirebasePage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  const [envStatus, setEnvStatus] = useState<any>({});
  const [testUserId, setTestUserId] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    // Check environment variables
    const envCheck = {
      apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      projectIdValue: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    };
    setEnvStatus(envCheck);

    // Test Firebase connection
    testFirebaseConnection().then((connected) => {
      setConnectionStatus(connected ? 'Connected ✅' : 'Failed ❌');
    });
  }, []);

  const testUserFetch = async () => {
    if (!testUserId.trim()) return;
    
    console.log('Testing user fetch for:', testUserId);
    setTestResult({ loading: true });
    
    try {
      const result = await getDocument('users', testUserId);
      setTestResult(result);
    } catch (error) {
      setTestResult({ data: null, error: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Firebase Debug Page</h1>
        
        {/* Environment Variables */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Environment Variables</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {Object.entries(envStatus).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span>{key}:</span>
                <span className={typeof value === 'boolean' ? (value ? 'text-green-600' : 'text-red-600') : 'text-blue-600'}>
                  {typeof value === 'boolean' ? (value ? '✅' : '❌') : value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Connection Status</h2>
          <p className="text-lg">{connectionStatus}</p>
        </div>

        {/* User Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Test User Fetch</h2>
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Enter Firebase User UID"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <button
              onClick={testUserFetch}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test User Fetch
            </button>
            
            {testResult && (
              <div className="mt-4">
                <h3 className="font-medium">Result:</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Setup Instructions</h2>
          <div className="space-y-2 text-sm">
            <p>1. Copy your Firebase configuration from the Firebase Console</p>
            <p>2. Update the .env.local file with your actual Firebase credentials</p>
            <p>3. Restart the development server</p>
            <p>4. All environment variables should show ✅</p>
            <p>5. Connection status should show "Connected ✅"</p>
          </div>
        </div>
      </div>
    </div>
  );
}