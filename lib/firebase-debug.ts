import { db } from './firebase';
import { collection, doc, getDoc } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  console.log('🔥 Testing Firebase connection...');
  
  // Check if Firebase is initialized
  console.log('📱 Firebase DB instance:', !!db);
  
  // Check environment variables
  const config = {
    apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  
  console.log('⚙️ Firebase config loaded:', config);
  console.log('🆔 Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  
  try {
    // Try to access the users collection
    const usersCollection = collection(db, 'users');
    console.log('📁 Users collection reference:', !!usersCollection);
    
    // Try a simple read operation
    const testDoc = doc(db, 'users', 'test');
    await getDoc(testDoc);
    console.log('✅ Firebase connection successful');
    
    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return false;
  }
};