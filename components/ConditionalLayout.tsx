"use client";
import { usePathname } from 'next/navigation';
import SiteHeader from "@/components/SiteHeader";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  return (
    <>
      {!isLandingPage && <SiteHeader />}
      {!isLandingPage && <EmailVerificationBanner />}
      {children}
    </>
  );
}

