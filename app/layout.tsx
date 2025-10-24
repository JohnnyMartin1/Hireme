import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import { FirebaseAuthProvider } from "@/components/FirebaseAuthProvider";
import { ProfileCompletionProvider } from "@/components/ProfileCompletionProvider";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import { NotificationProvider } from "@/components/NotificationSystem";
import FontAwesomeFallback from "@/components/FontAwesomeFallback";

export const metadata = { 
  title: "HireMe"
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <NotificationProvider>
          <FirebaseAuthProvider>
            <ProfileCompletionProvider>
              <FontAwesomeFallback />
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
