// lib/auth.ts
// Simple auth compatibility layer that uses centralized Firebase
import { auth } from "@/lib/firebase";

export const authFunction = async () => {
  const user = auth.currentUser;
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

// Export the auth function as 'auth' for compatibility
export const auth = authFunction;

// Also export the Firebase auth object for direct use
export { auth as authObject };
