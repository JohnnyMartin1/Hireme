import { Suspense } from 'react';
import VerifyToken from './verify-token';

export default function VerifyPage() {
  return (
    <main className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Verify your email</h1>
      <p className="mb-4">Please check your email for a verification link.</p>
      <Suspense fallback={<p>Verifying...</p>}>
        <VerifyToken />
      </Suspense>
    </main>
  );
}