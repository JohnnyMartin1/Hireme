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

  console.log('Firebase Admin SDK initialization:', {
    projectId: projectId ? 'SET' : 'MISSING',
    clientEmail: clientEmail ? 'SET' : 'MISSING', 
    privateKey: privateKey ? 'SET (length: ' + privateKey.length + ')' : 'MISSING',
    privateKeyStarts: privateKey ? privateKey.substring(0, 20) + '...' : 'N/A'
  });

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Firebase Admin SDK initialization error:', error);
      // Fallback to application default credentials
      admin.initializeApp();
    }
  } else {
    console.log('Missing Firebase credentials, using default');
    // Fallback to application default credentials if available
    admin.initializeApp();
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

