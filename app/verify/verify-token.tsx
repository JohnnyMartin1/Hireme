"use client";
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VerifyToken() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    async function verify() {
      setStatus('verifying');
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          const data = await res.json();
          setStatus('success');
          setMessage('Email verified successfully!');
          
          // Redirect to appropriate dashboard based on role
          setTimeout(() => {
            if (data.role === 'EMPLOYER') {
              router.push('/home/employer');
            } else {
              router.push('/home/seeker');
            }
          }, 2000);
        } else {
          const errorData = await res.json();
          setStatus('error');
          setMessage(errorData.error || 'Verification failed');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    }

    verify();
  }, [token, router]);

  if (status === 'idle') {
    return null;
  }

  if (status === 'verifying') {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Verifying your email...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-green-600 mb-2">Email Verified!</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-red-600 mb-2">Verification Failed</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            The verification link may be invalid or expired.
          </p>
          {email && (
            <p className="text-sm text-gray-500">
              Email: <span className="font-mono">{email}</span>
            </p>
          )}
        </div>
        <div className="mt-6 space-y-2">
          <Link
            href="/auth/login"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </Link>
          <br />
          <Link
            href="/auth/signup"
            className="inline-block text-blue-600 hover:underline text-sm"
          >
            Create a new account
          </Link>
        </div>
      </div>
    );
  }

  return null;
}