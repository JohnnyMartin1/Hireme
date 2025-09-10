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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
            // Use the actual profile data from Firestore
            const profile = profileData as any;
            setProfile({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: profile.role || 'JOB_SEEKER',
              firstName: profile.firstName,
              lastName: profile.lastName,
              companyName: profile.companyName,
              headline: profile.headline,
              skills: profile.skills,
              createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
            });
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

    return () => unsubscribe();
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
