import HomePageGate from "@/components/landing/HomePageGate";

/**
 * Landing shell is client-only (see HomePageGate) to avoid extension-driven
 * hydration mismatches. Metadata remains on the root layout.
 */
export default function Home() {
  return <HomePageGate />;
}
