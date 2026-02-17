import type { CapacitorConfig } from '@capacitor/cli';

// Determine if we're in development or production
// For local development, set this to true
// For production builds, set this to false
const isDev = true; // Change to false for production

const config: CapacitorConfig = {
  appId: 'com.hireme.app',
  appName: 'HireMe',
  webDir: 'public', // We'll create a simple entry point here
  server: isDev
    ? {
        // For development, point to local Next.js server
        // Use your Mac's IP address (not localhost) for iOS simulator
        // Update this IP if your network changes
        url: 'http://192.168.1.152:3000',
        cleartext: true, // Allow HTTP in development
      }
    : {
        // For production, point to your Vercel URL
        // Replace with your actual Vercel URL
        url: 'https://your-app.vercel.app',
        cleartext: false,
      },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e293b', // slate-800
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#0ea5e9', // sky-500
    },
  },
};

export default config;
