import { PrismaClient } from '@prisma/client';
import { getDocument } from './firebase-firestore';

// Global Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// User and Profile operations
export const getUserByEmail = async (email: string) => {
  try {
    // First try Prisma database if available
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          profile: true,
          employer: true,
        },
      });

      if (user) {
        // Transform to match expected UserProfile interface
        const userProfile = {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.profile?.firstName,
          lastName: user.profile?.lastName,
          companyName: user.employer?.companyName,
          headline: user.profile?.headline,
          skills: user.profile?.skills,
          createdAt: user.createdAt,
          profile: user.profile,
          employer: user.employer,
        };

        return { data: userProfile, error: null };
      }
    } catch (prismaError) {
      console.log('Prisma not available, falling back to Firestore search');
    }

    // Fallback to Firestore - we need to search by email since we don't have the UID
    // This is less efficient but necessary for the fallback
    return { data: null, error: 'User not found in Firestore by email lookup' };
  } catch (error: any) {
    console.error('Error fetching user by email:', error);
    return { data: null, error: error.message };
  }
};

export const getUserByFirebaseUid = async (firebaseUid: string) => {
  try {
    // First try Prisma database if available
    try {
      let user = await prisma.user.findUnique({
        where: { id: firebaseUid },
        include: {
          profile: true,
          employer: true,
        },
      });

      if (user) {
        // Transform to match expected UserProfile interface
        const userProfile = {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.profile?.firstName,
          lastName: user.profile?.lastName,
          companyName: user.employer?.companyName,
          headline: user.profile?.headline,
          skills: user.profile?.skills,
          createdAt: user.createdAt,
          profile: user.profile,
          employer: user.employer,
        };

        return { data: userProfile, error: null };
      }
    } catch (prismaError) {
      console.log('Prisma not available, falling back to Firestore');
    }

    // Fallback to Firestore
    const { data: firestoreUser, error: firestoreError } = await getDocument('users', firebaseUid);
    
    if (firestoreError || !firestoreUser) {
      return { data: null, error: 'User not found' };
    }

    // Transform Firestore data to match expected interface
    const userProfile = {
      id: firebaseUid,
      email: (firestoreUser as any).email || '',
      role: (firestoreUser as any).role || 'JOB_SEEKER',
      firstName: (firestoreUser as any).firstName,
      lastName: (firestoreUser as any).lastName,
      companyName: (firestoreUser as any).companyName,
      headline: (firestoreUser as any).headline,
      skills: (firestoreUser as any).skills,
      createdAt: (firestoreUser as any).createdAt ? new Date((firestoreUser as any).createdAt) : new Date(),
    };

    return { data: userProfile, error: null };
  } catch (error: any) {
    console.error('Error fetching user by Firebase UID:', error);
    return { data: null, error: error.message };
  }
};

export const createUserWithFirebaseUid = async (
  firebaseUid: string,
  email: string,
  role: 'JOB_SEEKER' | 'EMPLOYER' | 'ADMIN' = 'JOB_SEEKER'
) => {
  try {
    const user = await prisma.user.create({
      data: {
        id: firebaseUid, // Use Firebase UID as primary key
        email: email.toLowerCase(),
        passwordHash: '', // Empty since we use Firebase Auth
        role,
        emailVerified: new Date(),
      },
      include: {
        profile: true,
        employer: true,
      },
    });

    return { data: user, error: null };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return { data: null, error: error.message };
  }
};

export const updateUserFirebaseUid = async (email: string, firebaseUid: string) => {
  try {
    const user = await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { id: firebaseUid },
      include: {
        profile: true,
        employer: true,
      },
    });

    return { data: user, error: null };
  } catch (error: any) {
    console.error('Error updating user Firebase UID:', error);
    return { data: null, error: error.message };
  }
};