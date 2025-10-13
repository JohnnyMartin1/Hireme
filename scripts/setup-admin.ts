import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase config - you'll need to update these with your actual values
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function setupAdminAccount() {
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    const adminEmail = 'officialhiremeapp@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'your-admin-password-here';

    console.log('Setting up admin account...');

    // First, try to sign in to get the user ID
    try {
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      const user = userCredential.user;
      
      console.log('Admin user found:', user.uid);

      // Create or update the admin profile in Firestore
      const adminProfile = {
        id: user.uid,
        email: adminEmail,
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'User',
        createdAt: new Date(),
        emailVerified: true,
        isActive: true
      };

      await setDoc(doc(db, 'users', user.uid), adminProfile, { merge: true });
      
      console.log('✅ Admin profile created/updated successfully!');
      console.log('Admin user ID:', user.uid);
      console.log('You can now access the admin portal at /admin/login');
      
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        console.log('❌ Admin user not found in Firebase Auth.');
        console.log('Please create the user account first in Firebase Console:');
        console.log('1. Go to Firebase Console → Authentication');
        console.log('2. Add user with email:', adminEmail);
        console.log('3. Set a password');
        console.log('4. Run this script again');
      } else if (authError.code === 'auth/wrong-password') {
        console.log('❌ Wrong password. Please check your ADMIN_PASSWORD environment variable.');
      } else {
        console.error('Authentication error:', authError.message);
      }
    }

  } catch (error) {
    console.error('Error setting up admin account:', error);
  }
}

// Run the setup
setupAdminAccount();
