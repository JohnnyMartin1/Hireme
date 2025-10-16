"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';

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

// Helper function to calculate completion from profile data
const calculateCompletion = (profileData: any): number => {
  if (!profileData) return 0;
  
  const p = profileData;
  const completedSections = [
    // Section 1: Basic Information
    !!(p.firstName && p.lastName && p.headline),
    
    // Section 2: Education
    !!(p.education && p.education.length > 0 && p.education.every((edu: any) => 
      edu.school && edu.degree && edu.majors && edu.majors.length > 0 && edu.graduationYear
    )),
    
    // Section 3: Location and Work Preferences
    !!(p.locations && p.locations.length > 0 && 
       p.workPreferences && p.workPreferences.length > 0 && 
       p.jobTypes && p.jobTypes.length > 0),
    
    // Section 4: Skills and Expertise
    !!(p.skills && p.skills.length > 0),
    
    // Section 5: Experience and Activities
    !!(p.experience || 
       (p.extracurriculars && p.extracurriculars.length > 0) || 
       (p.certifications && p.certifications.length > 0) || 
       (p.languages && p.languages.length > 0)),
    
    // Section 6: Career Interests
    !!(p.careerInterests && p.careerInterests.length > 0),
    
    // Section 7: Work Authorization
    !!(p.workAuthorization && (
      p.workAuthorization.authorizedToWork != null || 
      p.workAuthorization.requiresVisaSponsorship != null
    )),
    
    // Section 8: Personal and Links
    !!(p.bio || p.linkedinUrl || p.portfolioUrl),
    
    // Section 9: Profile Picture and Resume
    !!(p.profileImageUrl && p.resumeUrl),
    
    // Section 10: Profile Video
    !!(p.videoUrl)
  ];
  
  const completedCount = completedSections.filter(Boolean).length;
  return Math.floor((completedCount / 10) * 100);
};

export function ProfileCompletionProvider({ children }: { children: React.ReactNode }) {
  const [completion, setCompletion] = useState(0);

  const updateCompletion = useCallback((profileData: any) => {
    const newCompletion = calculateCompletion(profileData);
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
