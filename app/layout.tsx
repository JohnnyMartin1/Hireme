import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import { FirebaseAuthProvider } from "@/components/FirebaseAuthProvider";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import { NotificationProvider } from "@/components/NotificationSystem";

export const metadata = { title: "HireMe" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NotificationProvider>
          <FirebaseAuthProvider>
            <SiteHeader />
            <EmailVerificationBanner />
            {children}
          </FirebaseAuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
