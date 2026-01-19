"use client";
import { usePathname } from 'next/navigation';
import SiteHeader from "@/components/SiteHeader";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  const isSignupPage = pathname?.startsWith('/auth/signup');

  return (
    <>
      {!isLandingPage && !isSignupPage && <SiteHeader />}
      {!isLandingPage && !isSignupPage && <EmailVerificationBanner />}
      {children}
    </>
  );
}

