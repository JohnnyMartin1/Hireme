import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Generic CRUD operations
export const createDocument = async (collectionName: string, data: any, id?: string) => {
  try {
    if (id) {
      await setDoc(doc(db, collectionName, id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id, error: null };
    } else {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, error: null };
    }
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

export const getDocument = async (collectionName: string, id: string) => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
    } else {
      return { data: null, error: 'Document not found' };
    }
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const deleteDocument = async (collectionName: string, id: string) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const queryDocuments = async (collectionName: string, constraints: any[] = []) => {
  try {
    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { data: documents, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

// Specific queries for your app
export const getProfilesByRole = async (role: string) => {
  return queryDocuments('users', [where('role', '==', role)]);
};

export const getProfilesBySkills = async (skills: string[]) => {
  return queryDocuments('users', [where('skills', 'array-contains-any', skills)]);
};

// Save/Unsave candidate functions
export const saveCandidate = async (employerId: string, candidateId: string) => {
  try {
    const saveData = {
      employerId,
      candidateId,
      savedAt: serverTimestamp()
    };
    
    // Check if already saved
    const existingSave = await queryDocuments('savedCandidates', [
      where('employerId', '==', employerId),
      where('candidateId', '==', candidateId)
    ]);
    
    if (existingSave.data.length > 0) {
      // Already saved, remove it (unsave)
      await deleteDocument('savedCandidates', existingSave.data[0].id);
      return { error: null, saved: false };
    } else {
      // Not saved, add it
      const { id, error } = await createDocument('savedCandidates', saveData);
      return { error, saved: true };
    }
  } catch (error: any) {
    return { error: error.message, saved: false };
  }
};

export const getSavedCandidates = async (employerId: string) => {
  try {
    const { data: savedData, error } = await queryDocuments('savedCandidates', [
      where('employerId', '==', employerId)
    ]);
    
    if (error) return { data: [], error };
    
    // Get the actual candidate profiles
    const candidateIds = savedData.map(save => (save as any).candidateId);
    const candidates = [];
    
    for (const candidateId of candidateIds) {
      const { data: candidate } = await getDocument('users', candidateId);
      if (candidate) {
        candidates.push({
          ...candidate,
          savedAt: (savedData.find(save => (save as any).candidateId === candidateId) as any)?.savedAt
        });
      }
    }
    
    // Sort by savedAt (most recent first)
    candidates.sort((a, b) => {
      const aTime = a.savedAt?.toDate ? a.savedAt.toDate() : a.savedAt;
      const bTime = b.savedAt?.toDate ? b.savedAt.toDate() : b.savedAt;
      
      if (!aTime && !bTime) return 0;
      if (!aTime) return 1;
      if (!bTime) return -1;
      
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
    
    return { data: candidates, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

export const isCandidateSaved = async (employerId: string, candidateId: string) => {
  try {
    const { data } = await queryDocuments('savedCandidates', [
      where('employerId', '==', employerId),
      where('candidateId', '==', candidateId)
    ]);
    
    return { saved: data.length > 0, error: null };
  } catch (error: any) {
    return { saved: false, error: error.message };
  }
};

// Messaging functions
export const getMessageThread = async (threadId: string) => {
  return getDocument('messageThreads', threadId);
};

export const getUserMessageThreads = async (userId: string) => {
  try {
    // Simplified query that doesn't require a composite index
    const q = query(
      collection(db, 'messageThreads'),
      where('participantIds', 'array-contains', userId)
    );

    const querySnapshot = await getDocs(q);
    const threads = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort by lastMessageAt on the client side to avoid needing an index
    threads.sort((a, b) => {
      const aItem = a as any;
      const bItem = b as any;
      const aTime = aItem.lastMessageAt?.toDate ? aItem.lastMessageAt.toDate() : aItem.lastMessageAt;
      const bTime = bItem.lastMessageAt?.toDate ? bItem.lastMessageAt.toDate() : bItem.lastMessageAt;
      
      if (!aTime && !bTime) return 0;
      if (!aTime) return 1;
      if (!bTime) return -1;
      
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return { data: threads, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

export const sendMessage = async (threadId: string, messageData: {
  senderId: string;
  senderName: string;
  content: string;
}) => {
  try {
    const message = {
      ...messageData,
      threadId,
      createdAt: serverTimestamp(),
      read: false
    };
    
    // Add message to messages collection
    const messageRef = await addDoc(collection(db, 'messages'), message);
    
    // Update thread's lastMessageAt
    await updateDocument('messageThreads', threadId, {
      lastMessageAt: serverTimestamp()
    });
    
    return { id: messageRef.id, error: null };
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

export const getThreadMessages = async (threadId: string) => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('threadId', '==', threadId)
    );
    
    const querySnapshot = await getDocs(q);
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort messages by createdAt on the client side to avoid needing an index
    messages.sort((a, b) => {
      const aItem = a as any;
      const bItem = b as any;
      const aTime = aItem.createdAt?.toDate ? aItem.createdAt.toDate() : aItem.createdAt;
      const bTime = bItem.createdAt?.toDate ? bItem.createdAt.toDate() : bItem.createdAt;
      
      if (!aTime && !bTime) return 0;
      if (!aTime) return 1;
      if (!bTime) return -1;
      
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });
    
    return { data: messages, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

export const markMessageAsRead = async (messageId: string) => {
  return updateDocument('messages', messageId, { read: true });
};

export const getOrCreateThread = async (participantIds: string[]) => {
  try {
    // Check if thread already exists
    const q = query(
      collection(db, 'messageThreads'),
      where('participantIds', '==', participantIds)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Thread exists, return it
      const thread = querySnapshot.docs[0];
      return { id: thread.id, error: null };
    } else {
      // Create new thread
      return createMessageThread(participantIds);
    }
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

export const createMessageThread = async (participantIds: string[]) => {
  try {
    const threadData = {
      participantIds,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'messageThreads'), threadData);
    return { id: docRef.id, error: null };
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

export const trackProfileView = async (candidateId: string, viewerId: string) => {
  try {
    const viewData = {
      candidateId,
      viewerId,
      viewedAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'profileViews'), viewData);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const getProfileViewCount = async (candidateId: string) => {
  try {
    const q = query(
      collection(db, 'profileViews'),
      where('candidateId', '==', candidateId)
    );
    
    const querySnapshot = await getDocs(q);
    return { count: querySnapshot.size, error: null };
  } catch (error: any) {
    return { count: 0, error: error.message };
  }
};

export const getEmployerJobs = async (employerId: string) => {
  try {
    const q = query(
      collection(db, 'jobs'),
      where('employerId', '==', employerId),
      where('status', '==', 'ACTIVE')
    );
    
    const querySnapshot = await getDocs(q);
    const jobs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { data: jobs, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

export const createCompanyRating = async (ratingData: {
  candidateId: string;
  employerId: string;
  companyName: string;
  jobId: string;
  jobTitle: string;
  rating: number;
  message?: string;
}) => {
  try {
    const ratingDoc = {
      ...ratingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'companyRatings'), ratingDoc);
    return { id: docRef.id, error: null };
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

export const getCompanyRatings = async (employerId: string) => {
  try {
    const q = query(
      collection(db, 'companyRatings'),
      where('employerId', '==', employerId)
    );
    
    const querySnapshot = await getDocs(q);
    const ratings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { data: ratings, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

export const getCompanyAverageRating = async (employerId: string) => {
  try {
    const { data: ratings, error } = await getCompanyRatings(employerId);
    
    if (error || !ratings || ratings.length === 0) {
      return { average: 0, count: 0, error: null };
    }
    
    const totalRating = ratings.reduce((sum, rating) => sum + (rating as any).rating, 0);
    const average = totalRating / ratings.length;
    
    return { average: Math.round(average * 10) / 10, count: ratings.length, error: null };
  } catch (error: any) {
    return { average: 0, count: 0, error: error.message };
  }
};

// Export common Firestore functions for convenience
export { collection, doc, where, orderBy, limit, serverTimestamp };
