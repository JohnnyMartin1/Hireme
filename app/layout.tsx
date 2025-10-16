import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import { FirebaseAuthProvider } from "@/components/FirebaseAuthProvider";
import { ProfileCompletionProvider } from "@/components/ProfileCompletionProvider";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import { NotificationProvider } from "@/components/NotificationSystem";

export const metadata = { title: "HireMe" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NotificationProvider>
          <FirebaseAuthProvider>
            <ProfileCompletionProvider>
              <SiteHeader />
              <EmailVerificationBanner />
              {children}
            </ProfileCompletionProvider>
          </FirebaseAuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
