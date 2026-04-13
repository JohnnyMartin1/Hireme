import dynamic from "next/dynamic";

/**
 * Home UI is loaded client-only so browser extensions that inject attributes
 * (e.g. bis_skin_checked) cannot cause React hydration mismatches on the
 * landing shell. Metadata stays on the root layout.
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

export default function Home() {
  return <HomePageClient />;
}
