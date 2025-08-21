"use client";
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function VerifyToken() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    async function verify() {
      if (!token) return;
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          setStatus('success');
          // redirect after a short delay
          setTimeout(() => router.push('/'), 1500);
        } else {
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      }
    }
    verify();
  }, [token, router]);

  if (status === 'success') {
    return <p className="text-green-600">Your email has been verified! Redirecting...</p>;
  }
  if (status === 'error') {
    return <p className="text-red-600">Verification failed. The token may be invalid or expired.</p>;
  }
  return null;
}