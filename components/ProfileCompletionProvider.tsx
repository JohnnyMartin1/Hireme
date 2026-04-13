"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';
import { calculateCompletion as calculateCompletionFromLib } from '@/lib/profile-completion';

interface ProfileCompletionContextType {
  completion: number;
  updateCompletion: (profileData: any) => void;
  setCompletion: (completion: number) => void;
}

const ProfileCompletionContext = createContext<ProfileCompletionContextType | undefined>(undefined);

export function useProfileCompletion() {
  const context = useContext(ProfileCompletionContext);
  if (context === undefined) {
    throw new Error('useProfileCompletion must be used within a ProfileCompletionProvider');
  }
  return context;
}

export { calculateCompletion } from '@/lib/profile-completion';

export function ProfileCompletionProvider({ children }: { children: React.ReactNode }) {
  const [completion, setCompletion] = useState(0);

  const updateCompletion = useCallback((profileData: any) => {
    const newCompletion = calculateCompletionFromLib(profileData);
    setCompletion(newCompletion);
  }, []);

  const value = {
    completion,
    updateCompletion,
    setCompletion
  };

  return (
    <ProfileCompletionContext.Provider value={value}>
      {children}
    </ProfileCompletionContext.Provider>
  );
}
