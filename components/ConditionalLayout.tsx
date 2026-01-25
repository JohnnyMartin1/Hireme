"use client";
import { usePathname } from 'next/navigation';
import SiteHeader from "@/components/SiteHeader";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  const isSignupPage = pathname?.startsWith('/auth/signup');
  const isLoginPage = pathname === '/auth/login';

  return (
    <>
      {!isLandingPage && !isSignupPage && !isLoginPage && <SiteHeader />}
      {!isLandingPage && !isSignupPage && !isLoginPage && <EmailVerificationBanner />}
      {children}
    </>
  );
}

