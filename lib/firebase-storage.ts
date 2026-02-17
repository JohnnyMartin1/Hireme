import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL, 
  deleteObject,
  listAll
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

// Upload resume file
export const uploadResume = async (file: File, userId: string) => {
  const path = `resumes/${userId}/${Date.now()}_${file.name}`;
  return uploadFile(file, path, {
    contentType: file.type,
    customMetadata: {
      uploadedBy: userId,
      fileType: 'resume'
    }
  });
};

// Upload video file with progress tracking
export const uploadVideo = async (
  file: File, 
  userId: string, 
  onProgress?: (progress: number) => void
) => {
  const path = `videos/${userId}/${Date.now()}_${file.name}`;
  
  if (onProgress) {
    // Use resumable upload for progress tracking
    return new Promise<{ url: string | null; path: string | null; error: string | null }>((resolve) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: userId,
          fileType: 'video'
        }
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        },
        (error) => {
          resolve({ url: null, path: null, error: error.message });
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              url: downloadURL,
              path: uploadTask.snapshot.ref.fullPath,
              error: null
            });
          } catch (error: any) {
            resolve({ url: null, path: null, error: error.message });
          }
        }
      );
    });
  } else {
    // Fallback to regular upload
    return uploadFile(file, path, {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userId,
        fileType: 'video'
      }
    });
  }
};

// Upload profile image
export const uploadProfileImage = async (file: File, userId: string) => {
  const path = `profile-images/${userId}/${Date.now()}_${file.name}`;
  return uploadFile(file, path, {
    contentType: file.type,
    customMetadata: {
      uploadedBy: userId,
      fileType: 'profile-image'
    }
  });
};

// Upload transcript file
export const uploadTranscript = async (file: File, userId: string) => {
  const path = `transcripts/${userId}/${Date.now()}_${file.name}`;
  return uploadFile(file, path, {
    contentType: file.type,
    customMetadata: {
      uploadedBy: userId,
      fileType: 'transcript'
    }
  });
};

// Delete file from Firebase Storage
export const deleteFile = async (path: string) => {
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Get download URL for a file
export const getFileURL = async (path: string) => {
  try {
    const fileRef = ref(storage, path);
    const url = await getDownloadURL(fileRef);
    return { url, error: null };
  } catch (error: any) {
    return { url: null, error: error.message };
  }
};

// List all files in a directory
export const listFiles = async (path: string) => {
  try {
    const listRef = ref(storage, path);
    const result = await listAll(listRef);
    
    const files = await Promise.all(
      result.items.map(async (item) => {
        const url = await getDownloadURL(item);
        return {
          name: item.name,
          path: item.fullPath,
          url
        };
      })
    );
    
    return { files, error: null };
  } catch (error: any) {
    return { files: [], error: error.message };
  }
};
