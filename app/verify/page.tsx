import { Suspense } from 'react';
import VerifyToken from './verify-token';

export default function VerifyPage() {
  return (
    <main className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-card border">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
        <p className="text-gray-600">Please check your email for a verification link.</p>
      </div>
      
      <Suspense fallback={
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying...</p>
        </div>
      }>
        <VerifyToken />
      </Suspense>
    </main>
  );
}