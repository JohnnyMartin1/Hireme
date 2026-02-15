import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  applyActionCode,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './firebase';

// Firebase Authentication Functions
export const signInWithFirebase = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    // Map Firebase error codes to user-friendly messages
    const errorCode = error?.code;
    
    if (errorCode === 'auth/invalid-credential' || 
        errorCode === 'auth/wrong-password' || 
        errorCode === 'auth/user-not-found') {
      return { user: null, error: 'Error: wrong username or password' };
    }
    
    // Return the original error message for other cases
    return { user: null, error: error.message };
  }
};

export const signUpWithFirebase = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    // Map Firebase error codes to user-friendly messages
    const errorCode = error?.code;
    
    if (errorCode === 'auth/email-already-in-use') {
      return { user: null, error: 'This email is already registered. Please use a different email or try logging in.' };
    }
    
    if (errorCode === 'auth/invalid-email') {
      return { user: null, error: 'Please enter a valid email address.' };
    }
    
    if (errorCode === 'auth/operation-not-allowed') {
      return { user: null, error: 'Email/password accounts are not enabled. Please contact support.' };
    }
    
    if (errorCode === 'auth/weak-password') {
      return { user: null, error: 'Password is too weak. Please use a stronger password (at least 8 characters).' };
    }
    
    if (errorCode === 'auth/network-request-failed') {
      return { user: null, error: 'Network error. Please check your internet connection and try again.' };
    }
    
    if (errorCode === 'auth/too-many-requests') {
      return { user: null, error: 'Too many signup attempts. Please wait a few minutes and try again.' };
    }
    
    // Return a user-friendly message for unknown errors
    console.error('Firebase signup error:', errorCode, error.message);
    return { user: null, error: 'Unable to create account. Please check your information and try again.' };
  }
};

export const signOutFromFirebase = async () => {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Send email verification
export const sendVerificationEmail = async (user: FirebaseUser) => {
  try {
    await sendEmailVerification(user);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Verify email with action code
export const verifyEmailWithCode = async (actionCode: string) => {
  try {
    await applyActionCode(auth, actionCode);
    // Reload user to update emailVerified status
    if (auth.currentUser) {
      await auth.currentUser.reload();
    }
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Resend verification email
export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { error: 'No user logged in' };
    }
    if (user.emailVerified) {
      return { error: 'Email already verified' };
    }
    await sendEmailVerification(user);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Firebase Auth State Listener
export const onFirebaseAuthStateChanged = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Get current Firebase user
export const getCurrentFirebaseUser = () => {
  return auth.currentUser;
};
