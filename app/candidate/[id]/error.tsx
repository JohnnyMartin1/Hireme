"use client";

export default function CandidateProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-lg font-semibold text-navy-900 mb-2">This profile could not be shown</h1>
      <p className="text-sm text-slate-600 mb-4 max-w-md">Try again or return to search.</p>
      <button type="button" onClick={() => reset()} className="px-4 py-2 rounded-lg bg-navy-800 text-white text-sm font-medium">
        Try again
      </button>
    </div>
  );
}
