import { Suspense } from "react";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 mobile-safe-top flex items-center justify-center">
          <p className="text-slate-600 text-sm">Loading messages…</p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
