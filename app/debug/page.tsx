"use client";
import { useState, useEffect } from 'react';
import { getProfilesByRole } from '@/lib/firebase-firestore';

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkData = async () => {
    setLoading(true);
    try {
      console.log('Checking Firebase data...');
      
      // Check for job seekers
      const { data: jobSeekers, error: jobSeekersError } = await getProfilesByRole('JOB_SEEKER');
      console.log('Job Seekers:', jobSeekers);
      console.log('Job Seekers Error:', jobSeekersError);
      
      // Check for employers
      const { data: employers, error: employersError } = await getProfilesByRole('EMPLOYER');
      console.log('Employers:', employers);
      console.log('Employers Error:', employersError);
      
      setData({
        jobSeekers: { data: jobSeekers, error: jobSeekersError },
        employers: { data: employers, error: employersError }
      });
    } catch (error) {
      console.error('Debug error:', error);
      setData({ error: error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Firebase Debug Page</h1>
        
        <button
          onClick={checkData}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-6"
        >
          {loading ? 'Checking...' : 'Check Firebase Data'}
        </button>
        
        {data && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Job Seekers</h2>
              {data.jobSeekers?.error ? (
                <p className="text-red-600">Error: {data.jobSeekers.error}</p>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">Count: {data.jobSeekers?.data?.length || 0}</p>
                  <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                    {JSON.stringify(data.jobSeekers?.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Employers</h2>
              {data.employers?.error ? (
                <p className="text-red-600">Error: {data.employers.error}</p>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">Count: {data.employers?.data?.length || 0}</p>
                  <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                    {JSON.stringify(data.employers?.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            
            {data.error && (
              <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                <h2 className="text-xl font-semibold text-red-800 mb-4">General Error</h2>
                <pre className="text-red-600 overflow-auto text-sm">
                  {JSON.stringify(data.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
