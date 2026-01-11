import "./globals.css";
import { FirebaseAuthProvider } from "@/components/FirebaseAuthProvider";
import { ProfileCompletionProvider } from "@/components/ProfileCompletionProvider";
import { NotificationProvider } from "@/components/NotificationSystem";
import FontAwesomeFallback from "@/components/FontAwesomeFallback";
import ConditionalLayout from "@/components/ConditionalLayout";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-inter">
        <NotificationProvider>
          <FirebaseAuthProvider>
            <ProfileCompletionProvider>
              <FontAwesomeFallback />
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
            </ProfileCompletionProvider>
          </FirebaseAuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
