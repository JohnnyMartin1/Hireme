import "./globals.css";
import { FirebaseAuthProvider } from "@/components/FirebaseAuthProvider";
import { ProfileCompletionProvider } from "@/components/ProfileCompletionProvider";
import { NotificationProvider } from "@/components/NotificationSystem";
import FontAwesomeFallback from "@/components/FontAwesomeFallback";
import ConditionalLayout from "@/components/ConditionalLayout";

export const metadata = { 
  title: "HireMe - The Complete Hiring System That Closes The Loop",
  description: "HireMe is an end-to-end hiring platform that connects sourcing, screening, collaboration, and onboarding into one seamless workflow. Built for candidates, employers, and recruiters.",
  keywords: "job search, hiring platform, recruitment, talent acquisition, job seekers, employers",
  authors: [{ name: "HireMe" }],
  creator: "HireMe",
  publisher: "HireMe",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      {
        rel: 'android-chrome-192x192',
        url: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        rel: 'android-chrome-512x512',
        url: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://officialhireme.com',
    siteName: 'HireMe',
    title: 'HireMe - The Complete Hiring System That Closes The Loop',
    description: "HireMe is an end-to-end hiring platform that connects sourcing, screening, collaboration, and onboarding into one seamless workflow.",
    images: [
      {
        url: '/logo.svg',
        width: 895,
        height: 265,
        alt: 'HireMe Logo',
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HireMe - The Complete Hiring System That Closes The Loop',
    description: "HireMe is an end-to-end hiring platform that connects sourcing, screening, collaboration, and onboarding into one seamless workflow.",
    images: ['/logo.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add Google Search Console verification if you have it
    // google: 'your-verification-code',
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1F4B' }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ fontSize: '16px' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/site.webmanifest" />
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
