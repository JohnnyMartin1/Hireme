// lib/auth.ts
// This file is a compatibility layer for any code that expects NextAuth-style auth
// We're using Firebase authentication, so this redirects to the appropriate Firebase functions

// Import Firebase auth directly
import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

// Your Firebase configuration with fallback values for build time
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ''
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(app);

// Export a function that mimics NextAuth's auth() function
export const auth = async () => {
  const user = firebaseAuth.currentUser;
  if (!user) {
    return null;
  }
  
  // Return a session-like object that matches what NextAuth would return
  return {
    user: {
      id: user.uid,
      email: user.email,
      name: user.displayName,
      image: user.photoURL,
      // Add any other properties your app expects
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
  };
};

// Also export the Firebase auth object for direct use
export { firebaseAuth as authObject };
