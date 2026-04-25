"use client";

import dynamic from "next/dynamic";

/**
 * Client-only gate for the marketing home. `next/dynamic` with `ssr: false` must
 * run in a Client Component so the App Router does not emit broken RSC flight
 * references (which surface as JSON.parse / __webpack_require__ "call" errors).
 */
const HomePageClient = dynamic(
  () => import("@/components/landing/HomePageClient"),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-screen bg-slate-50"
        aria-busy="true"
        aria-label="Loading"
      />
    ),
  }
);

export default function HomePageGate() {
  return <HomePageClient />;
}
