"use client";
import { usePathname } from 'next/navigation';
import SiteHeader from "@/components/SiteHeader";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import LegalFooterStrip from "@/components/LegalFooterStrip";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  const isSignupPage = pathname?.startsWith('/auth/signup');
  const isLoginPage = pathname === '/auth/login';
  const showAppChrome = !isLandingPage && !isSignupPage && !isLoginPage;

  return (
    <>
      {showAppChrome && <SiteHeader />}
      {showAppChrome && <EmailVerificationBanner />}
      {children}
      {showAppChrome && <LegalFooterStrip />}
    </>
  );
}

