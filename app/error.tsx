"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary. Kept dependency-light so it still renders if a
 * heavy page chunk fails, avoiding the dev overlay “missing required error components” loop.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
      <h1 className="text-xl font-semibold text-navy-900">Something went wrong</h1>
      <p className="max-w-md text-sm text-slate-600">
        {error.message || "An unexpected error occurred. Try again, or return home."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-50"
        >
          Home
        </a>
      </div>
    </div>
  );
}
