// lib/auth.ts
// This file is a compatibility layer for any code that expects NextAuth-style auth
// We're using Firebase authentication, so this redirects to the appropriate Firebase functions

import { auth as firebaseAuth } from '@/lib/firebase';
import { getCurrentFirebaseUser } from '@/lib/firebase-auth';

// Export a function that mimics NextAuth's auth() function
export const auth = async () => {
  const user = getCurrentFirebaseUser();
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
