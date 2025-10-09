"use client";
import { useRouter } from 'next/navigation';

/**
 * History-aware back button. Falls back to a safe route if there is no
 * browser history (e.g. first page load). Use this on pages where
 * the user can navigate deeper in a flow and may need to return.
 */
export default function BackButton({ fallback = '/home/seeker' }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallback);
        }
      }}
      className="text-blue-600 hover:underline flex items-center space-x-1"
    >
      <span>&larr;</span>
      <span>Back</span>
    </button>
  );
}