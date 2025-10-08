import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import { FirebaseAuthProvider } from "@/components/FirebaseAuthProvider";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";

export const metadata = { title: "HireMe" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FirebaseAuthProvider>
          <SiteHeader />
          <EmailVerificationBanner />
          {children}
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
