"use client";

export default function EmployerError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-lg font-semibold text-navy-900 mb-2">This employer page failed to load</h1>
      <p className="text-sm text-slate-600 mb-4 max-w-md">You can try again. If the problem continues, go back to your dashboard.</p>
      <button type="button" onClick={() => reset()} className="px-4 py-2 rounded-lg bg-navy-800 text-white text-sm font-medium">
        Try again
      </button>
    </div>
  );
}
