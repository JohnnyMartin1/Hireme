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
    return { user: null, error: error.message };
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
