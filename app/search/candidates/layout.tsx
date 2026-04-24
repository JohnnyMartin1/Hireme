import { Suspense } from "react";

export default function SearchCandidatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-slate-600 text-sm">Loading candidate search…</p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
