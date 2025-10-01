"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserByFirebaseUid } from '@/lib/database';
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
          // First try to fetch user by Firebase UID
          let { data: userData, error: userError } = await getUserByFirebaseUid(firebaseUser.uid);
          
          if (userError || !userData) {
            console.log('User not found by Firebase UID, this is normal for Firestore-based profiles');
            // For Firestore users, the getUserByFirebaseUid will handle the fallback
            // No need for additional logic here since the function already tries Firestore
          }

          if (userData) {
            setProfile({
              id: userData.id,
              email: userData.email,
              role: userData.role || 'JOB_SEEKER',
              firstName: userData.firstName,
              lastName: userData.lastName,
              companyName: userData.companyName,
              headline: userData.headline,
              skills: userData.skills,
              createdAt: userData.createdAt || new Date(),
            });
          } else {
            // Fallback to basic profile if all else fails
            setProfile({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: 'JOB_SEEKER',
              createdAt: new Date(),
            });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Fallback to basic profile
          setProfile({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: 'JOB_SEEKER',
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
