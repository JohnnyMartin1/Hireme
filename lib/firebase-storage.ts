import { 
  ref, 
  uploadBytes, 
  getDownloadURL
} from 'firebase/storage';
import { storage } from './firebase';

// Upload file to Firebase Storage
export const uploadFile = async (
  file: File, 
  path: string, 
  metadata?: any
) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return { 
      url: downloadURL, 
      path: snapshot.ref.fullPath, 
      error: null 
    };
  } catch (error: any) {
    return { 
      url: null, 
      path: null, 
      error: error.message 
    };
  }
};

// Private candidate files are intentionally uploaded via secured API routes.
