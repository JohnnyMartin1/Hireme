"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface UserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email: string;
  role: 'JOB_SEEKER' | 'EMPLOYER' | 'ADMIN';
  headline?: string;
  skills?: string[];
  openToOpp?: boolean;
  isActive?: boolean;
  // Education
  school?: string;
  major?: string;
  minor?: string;
  graduationYear?: string;
  gpa?: string;
  // Location & Preferences
  location?: string;
  workPreferences?: string[];
  jobTypes?: string[];
  // Experience & Activities
  experience?: string;
  extracurriculars?: string[];
  certifications?: string[];
  languages?: string[];
  // Personal
  bio?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  createdAt: Date;
}

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
        // For now, create a basic profile from Firebase user
        setProfile({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          role: 'JOB_SEEKER', // Default role
          createdAt: new Date(),
        });
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
