import admin from 'firebase-admin';

// Initialize Firebase Admin SDK once per server runtime
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  
  // More robust private key parsing
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  
  // Remove quotes if they exist
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  
  // Replace literal \n with actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n');

  if (process.env.NODE_ENV === 'development') {
    console.log('Firebase Admin SDK initialization:', {
      projectId: projectId ? 'SET' : 'MISSING',
      clientEmail: clientEmail ? 'SET' : 'MISSING',
      privateKey: privateKey ? 'SET' : 'MISSING',
    });
  }

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('Firebase Admin SDK initialized successfully');
      }
    } catch (error) {
      console.error('Firebase Admin SDK initialization error:', error);
      admin.initializeApp();
    }
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log('Missing Firebase credentials, using default');
    }
    admin.initializeApp();
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

