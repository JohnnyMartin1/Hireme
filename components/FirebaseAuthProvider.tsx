"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getDocument } from '@/lib/firebase-firestore';
import type { UserProfile } from "@/types/user";


interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('Firebase auth loading timeout - setting loading to false');
      setLoading(false);
    }, 2000); // 2 second timeout

    // Try to initialize Firebase auth with error handling
    try {
      console.log('Initializing Firebase auth...');
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        clearTimeout(loadingTimeout); // Clear timeout when auth state changes
        console.log('Firebase auth state changed:', firebaseUser ? 'User logged in' : 'No user');
        setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Fetch user profile from Firestore to get the actual role
          const { data: profileData, error: profileError } = await getDocument('users', firebaseUser.uid);
          
          if (profileError) {
            console.error('Error fetching user profile:', profileError);
            // Fallback to basic profile with default role
            setProfile({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: 'JOB_SEEKER', // Default role as fallback
              createdAt: new Date(),
            });
          } else if (profileData) {
            // Use the actual profile data from Firestore (include all fields)
            const profile = profileData as any;
            const createdAt = profile.createdAt?.toDate
              ? profile.createdAt.toDate()
              : (profile.createdAt ? new Date(profile.createdAt) : new Date());

            setProfile({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: profile.role || 'JOB_SEEKER',
              ...profile,
              createdAt,
            } as any);
          } else {
            // No profile found, create basic profile
            setProfile({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: 'JOB_SEEKER', // Default role
              createdAt: new Date(),
            });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Fallback to basic profile
          setProfile({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: 'JOB_SEEKER', // Default role as fallback
            createdAt: new Date(),
          });
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

      return () => {
        clearTimeout(loadingTimeout);
        unsubscribe();
      };
    } catch (error) {
      console.error('Firebase auth initialization error:', error);
      clearTimeout(loadingTimeout);
      setLoading(false);
    }
  }, []);

  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    profile,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
}
