import "./globals.css";
import Script from "next/script";
import { FirebaseAuthProvider } from "@/components/FirebaseAuthProvider";
import { ProfileCompletionProvider } from "@/components/ProfileCompletionProvider";
import { NotificationProvider } from "@/components/NotificationSystem";
import FontAwesomeFallback from "@/components/FontAwesomeFallback";
import ConditionalLayout from "@/components/ConditionalLayout";

const GA_MEASUREMENT_ID = "G-ELC38YVCE3";

export const metadata = { 
  title: "HireMe - The Complete Hiring System That Closes The Loop",
  description: "HireMe is an end-to-end hiring platform that connects sourcing, screening, collaboration, and onboarding into one seamless workflow. Built for candidates, employers, and recruiters.",
  keywords: "job search, hiring platform, recruitment, talent acquisition, job seekers, employers",
  authors: [{ name: "HireMe" }],
  creator: "HireMe",
  publisher: "HireMe",
  // Favicon only (Google search + browser tab). On-site logos use logo.svg and are unchanged.
  icons: {
    icon: [
      { url: '/favicon.svg?v=5', type: 'image/svg+xml', sizes: 'any' },
      { url: '/favicon.ico?v=5', sizes: 'any' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
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
        <link rel="icon" href="/favicon.svg?v=5" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico?v=5" sizes="any" />
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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
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
