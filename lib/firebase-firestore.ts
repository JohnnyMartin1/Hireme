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
import { db, auth } from './firebase';
import { canonicalPipelineEntryId, dedupePipelineEntriesByCandidate } from '@/lib/pipeline-canonical';

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

/** Employer messaging: prefer public candidate slice; fall back to users for employer↔employer threads. */
export const getParticipantProfileForMessaging = async (
  otherId: string,
  viewerRole?: string | null
) => {
  const isEmployerLike =
    viewerRole === "EMPLOYER" || viewerRole === "RECRUITER" || viewerRole === "ADMIN";
  if (isEmployerLike) {
    const pub = await getDocument("publicCandidateProfiles", otherId);
    if (pub.data) {
      return {
        data: { ...pub.data, role: (pub.data as any).role || "JOB_SEEKER" },
        error: null as string | null,
      };
    }
  }
  return getDocument("users", otherId);
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

// Upsert (create if missing, update otherwise) with merge
export const upsertDocument = async (collectionName: string, id: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
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

// Specific queries for your app. Pass idToken for verify-users (required for API auth).
export const getProfilesByRole = async (
  role: string,
  idToken?: string,
  options?: { verifyAuthUsers?: boolean }
) => {
  const result =
    role === "JOB_SEEKER"
      ? await queryDocuments("publicCandidateProfiles", [where("role", "==", "JOB_SEEKER")])
      : await queryDocuments("users", [where("role", "==", role)]);
  const shouldVerifyAuthUsers = options?.verifyAuthUsers !== false;

  if (shouldVerifyAuthUsers && result.data && result.data.length > 0 && idToken) {
    try {
      const userIds = result.data.map((user: any) => user.id);
      
      const verifyResponse = await fetch('/api/auth/verify-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ userIds }),
      });
      
      if (verifyResponse.ok) {
        const { validUserIds } = await verifyResponse.json();
        
        // Filter out users that don't exist in Firebase Auth
        const validProfiles = result.data.filter((profile: any) => 
          validUserIds.includes(profile.id)
        );
        
        console.log(`Filtered ${result.data.length - validProfiles.length} invalid users from ${role} search`);
        
        return {
          data: validProfiles,
          error: null
        };
      }
    } catch (error) {
      console.error('Error verifying users in Firebase Auth:', error);
      // Return original result if verification fails
    }
  }
  
  return result;
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
    
    // Type assertion for saved data
    const typedSavedData = savedData as any[];
    
    // Get the actual candidate profiles
    const candidateIds = typedSavedData.map(save => save.candidateId);
    const candidates = [];
    
    for (const candidateId of candidateIds) {
      const { data: candidate } = await getDocument("publicCandidateProfiles", candidateId);
      if (candidate) {
        candidates.push({
          ...candidate,
          id: candidateId,
          role: "JOB_SEEKER",
          savedAt: typedSavedData.find((save) => save.candidateId === candidateId)?.savedAt,
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

// ============================================
// CANDIDATE PIPELINE
// ============================================

export const PIPELINE_STAGES = [
  'NEW',
  'SHORTLIST',
  'CONTACTED',
  'RESPONDED',
  'INTERVIEW',
  'FINALIST',
  'OFFER',
  'HIRED',
  'REJECTED',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const normalizePipelineStage = (value: unknown): PipelineStage => {
  const raw = String(value || '').toUpperCase().trim();
  if (raw === 'SHORTLISTED') return 'SHORTLIST';
  if ((PIPELINE_STAGES as readonly string[]).includes(raw)) {
    return raw as PipelineStage;
  }
  return 'NEW';
};

export interface CandidatePipelineEntry {
  id: string;
  jobId: string;
  candidateId: string;
  companyId: string;
  stage: PipelineStage;
  ownerId?: string;
  /** Phase 4 — id of primary `candidateOffers` doc for this candidate+job */
  currentOfferId?: string | null;
  /** Mirror of latest offer `status` for recruiter UI */
  offerStatus?: string | null;
  /** Phase 4 hiring outcome for this candidate on this job */
  hiringOutcome?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastContactedAt?: unknown;
  nextFollowUpAt?: unknown;
}

export const getPipelineByJob = async (jobId: string) => {
  try {
    const { data, error } = await queryDocuments('candidatePipelineEntries', [
      where('jobId', '==', jobId),
    ]);
    if (error) return { data: [] as CandidatePipelineEntry[], error };
    const rows = (data || []) as CandidatePipelineEntry[];
    const deduped = dedupePipelineEntriesByCandidate(
      rows.map((e) => ({
        ...e,
        id: e.id,
        jobId: String(e.jobId || jobId),
        candidateId: String(e.candidateId || ''),
      }))
    );
    return { data: deduped as CandidatePipelineEntry[], error: null };
  } catch (error: any) {
    return { data: [] as CandidatePipelineEntry[], error: error.message };
  }
};

export const getPipelineEntryForJobCandidate = async (
  jobId: string,
  candidateId: string
) => {
  try {
    const entryId = canonicalPipelineEntryId(jobId, candidateId);
    const { data: direct, error: directErr } = await getDocument('candidatePipelineEntries', entryId);
    if (!directErr && direct) {
      return { data: { ...(direct as object), id: entryId } as CandidatePipelineEntry, error: null };
    }
    const { data, error } = await queryDocuments('candidatePipelineEntries', [
      where('jobId', '==', jobId),
      where('candidateId', '==', candidateId),
    ]);
    if (error) return { data: null as CandidatePipelineEntry | null, error };
    const merged = dedupePipelineEntriesByCandidate(
      ((data || []) as CandidatePipelineEntry[]).map((e) => ({
        ...e,
        id: e.id,
        jobId: String(e.jobId || jobId),
        candidateId: String(e.candidateId || candidateId),
      }))
    );
    return { data: (merged[0] || null) as CandidatePipelineEntry | null, error: null };
  } catch (error: any) {
    return { data: null as CandidatePipelineEntry | null, error: error.message };
  }
};

// ============================================
// RECRUITER NOTES
// ============================================

export interface RecruiterNote {
  id: string;
  jobId: string;
  candidateId: string;
  pipelineEntryId?: string | null;
  authorUserId: string;
  body: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const getRecruiterNotes = async (jobId: string, candidateId: string) => {
  try {
    const { data, error } = await queryDocuments('recruiterNotes', [
      where('jobId', '==', jobId),
      where('candidateId', '==', candidateId),
    ]);
    if (error) return { data: [] as RecruiterNote[], error };

    const notes = ((data || []) as RecruiterNote[]).sort((a: any, b: any) => {
      const aDate = a?.updatedAt?.toDate ? a.updatedAt.toDate() : (a?.updatedAt || a?.createdAt || null);
      const bDate = b?.updatedAt?.toDate ? b.updatedAt.toDate() : (b?.updatedAt || b?.createdAt || null);
      const aTime = aDate ? new Date(aDate).getTime() : 0;
      const bTime = bDate ? new Date(bDate).getTime() : 0;
      return bTime - aTime;
    });
    return { data: notes, error: null };
  } catch (error: any) {
    return { data: [] as RecruiterNote[], error: error.message };
  }
};

export const createRecruiterNote = async (input: {
  jobId: string;
  candidateId: string;
  pipelineEntryId?: string | null;
  authorUserId: string;
  body: string;
}) => {
  try {
    const trimmed = String(input.body || '').trim();
    if (!trimmed) return { id: null, error: 'Note body is required' };

    const payload = {
      jobId: input.jobId,
      candidateId: input.candidateId,
      pipelineEntryId: input.pipelineEntryId ?? null,
      authorUserId: input.authorUserId,
      body: trimmed,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const { id, error } = await createDocument('recruiterNotes', payload);
    return { id, error };
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

export const updateRecruiterNote = async (
  noteId: string,
  authorUserId: string,
  body: string
) => {
  try {
    const trimmed = String(body || '').trim();
    if (!trimmed) return { error: 'Note body is required' };
    const { data: existing, error: readError } = await getDocument('recruiterNotes', noteId);
    if (readError || !existing) return { error: 'Note not found' };
    if ((existing as any).authorUserId !== authorUserId) return { error: 'You can only edit your own note' };

    return updateDocument('recruiterNotes', noteId, {
      body: trimmed,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    return { error: error.message };
  }
};

export const deleteRecruiterNote = async (noteId: string, authorUserId: string) => {
  try {
    const { data: existing, error: readError } = await getDocument('recruiterNotes', noteId);
    if (readError || !existing) return { error: 'Note not found' };
    if ((existing as any).authorUserId !== authorUserId) return { error: 'You can only delete your own note' };
    return deleteDocument('recruiterNotes', noteId);
  } catch (error: any) {
    return { error: error.message };
  }
};

/** Job snapshot stored on message documents and messageThreads (first-class thread ↔ job). */
export type MessageJobDetailsShape = {
  jobId: string;
  jobTitle: string;
  employmentType: string;
  location: string;
  jobDescription: string;
};

function buildThreadJobPersistPayload(details: MessageJobDetailsShape): Record<string, unknown> {
  return {
    jobId: details.jobId,
    jobContext: {
      jobTitle: details.jobTitle,
      employmentType: details.employmentType,
      location: details.location,
      jobDescription: String(details.jobDescription || "").slice(0, 12000),
    },
  };
}

/** Read job context from a messageThreads document (preferred over scanning messages). */
export function threadDataToJobDetails(threadData: Record<string, unknown> | null | undefined): MessageJobDetailsShape | null {
  if (!threadData) return null;
  const jobId = threadData.jobId ? String(threadData.jobId) : "";
  if (!jobId) return null;
  const jc = (threadData.jobContext as Record<string, unknown>) || {};
  return {
    jobId,
    jobTitle: String(jc.jobTitle || ""),
    employmentType: String(jc.employmentType || ""),
    location: String(jc.location || ""),
    jobDescription: String(jc.jobDescription || ""),
  };
}

// Messaging functions
export const getMessageThread = async (threadId: string) => {
  return getDocument('messageThreads', threadId);
};

export const getUserMessageThreads = async (
  userId: string,
  options?: { jobId?: string | null }
) => {
  try {
    // Always scope to participantIds so query matches strict security rules.
    const constraints: any[] = [where('participantIds', 'array-contains', userId)];
    const scopedJobId = String(options?.jobId || '').trim();
    if (scopedJobId) {
      constraints.push(where('jobId', '==', scopedJobId));
    }
    const q = query(collection(db, 'messageThreads'), ...constraints);

    const querySnapshot = await getDocs(q);
    const threads = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    // Sort by lastMessageAt on the client side to avoid needing an index
    threads.sort((a, b) => {
      const aTime = a.lastMessageAt?.toDate ? a.lastMessageAt.toDate() : a.lastMessageAt;
      const bTime = b.lastMessageAt?.toDate ? b.lastMessageAt.toDate() : b.lastMessageAt;
      
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
  jobDetails?: {
    jobId: string;
    jobTitle: string;
    employmentType: string;
    location: string;
    jobDescription: string;
  };
}, idToken?: string) => {
  try {
    /** Outbound payload → thread doc → recent messages (backwards compatible). */
    const resolveThreadJobId = async (data: typeof messageData): Promise<string | null> => {
      if (data.jobDetails?.jobId) return String(data.jobDetails.jobId);
      const { data: th } = await getDocument("messageThreads", threadId);
      const fromThread = threadDataToJobDetails(th as Record<string, unknown> | null | undefined);
      if (fromThread?.jobId) return String(fromThread.jobId);
      const messagesQuery = query(
        collection(db, 'messages'),
        where('threadId', '==', threadId),
        limit(25)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      for (const msgDoc of messagesSnapshot.docs) {
        const docData: any = msgDoc.data();
        if (docData?.jobDetails?.jobId) return String(docData.jobDetails.jobId);
      }
      return null;
    };

    const jobDetailsFromJobDoc = (job: any, jobId: string) => ({
      jobId,
      jobTitle: String(job?.title || ''),
      employmentType: String(job?.employment || ''),
      location: `${job?.locationCity || ''} ${job?.locationState || ''}`.trim() || String(job?.location || ''),
      jobDescription: String(job?.description || ''),
    });

    const { data: senderProfile } = await getDocument('users', messageData.senderId);
    const senderRole = String((senderProfile as any)?.role || '');

    let outbound = { ...messageData };
    if (!outbound.jobDetails?.jobId) {
      const resolvedJobId = await resolveThreadJobId(outbound);
      if (resolvedJobId) {
        const { data: jobRow } = await getDocument('jobs', resolvedJobId);
        if (jobRow) {
          outbound = {
            ...outbound,
            jobDetails: jobDetailsFromJobDoc(jobRow, resolvedJobId),
          };
        }
      }
    } else if (outbound.jobDetails && (!outbound.jobDetails.jobTitle || !outbound.jobDetails.jobDescription)) {
      const { data: jobRow } = await getDocument('jobs', outbound.jobDetails.jobId);
      if (jobRow) {
        outbound = {
          ...outbound,
          jobDetails: jobDetailsFromJobDoc(jobRow, outbound.jobDetails.jobId),
        };
      }
    }

    if (
      (senderRole === 'EMPLOYER' || senderRole === 'RECRUITER') &&
      !outbound.jobDetails?.jobId
    ) {
      return {
        id: null,
        error: 'Attach a job to this conversation before sending outreach.',
      };
    }

    const syncPipelineWithMessage = async () => {
      if (!idToken || !senderRole) return;

      const associatedJobId = await resolveThreadJobId(outbound);
      if (!associatedJobId) return;

      const { data: threadData } = await getDocument('messageThreads', threadId);
      const participantIds = Array.isArray((threadData as any)?.participantIds)
        ? ((threadData as any).participantIds as string[])
        : [];
      const otherParticipantId = participantIds.find((id) => id !== outbound.senderId) || null;
      const { data: otherProfile } = otherParticipantId
        ? await getDocument('users', otherParticipantId)
        : { data: null };

      const pipelineCandidateId =
        senderRole === 'JOB_SEEKER'
          ? outbound.senderId
          : ((otherProfile as any)?.role === 'JOB_SEEKER' ? otherParticipantId : null);
      if (!pipelineCandidateId) return;

      const { data: existingEntry } = await getPipelineEntryForJobCandidate(associatedJobId, pipelineCandidateId);
      const currentStage = existingEntry?.stage || 'NEW';

      const { postJobPipeline } = await import('@/lib/pipeline-client');

      if (senderRole === 'EMPLOYER' || senderRole === 'RECRUITER' || senderRole === 'ADMIN') {
        const stageShouldBecomeContacted =
          currentStage === 'NEW' || currentStage === 'SHORTLIST' || currentStage === 'CONTACTED';
        await postJobPipeline(
          associatedJobId,
          {
            candidateId: pipelineCandidateId,
            stage: stageShouldBecomeContacted ? 'CONTACTED' : normalizePipelineStage(currentStage),
          },
          idToken
        );
      }

      if (senderRole === 'JOB_SEEKER') {
        const stageShouldBecomeResponded =
          currentStage === 'NEW' || currentStage === 'SHORTLIST' || currentStage === 'CONTACTED' || currentStage === 'RESPONDED';
        await postJobPipeline(
          associatedJobId,
          {
            candidateId: pipelineCandidateId,
            stage: stageShouldBecomeResponded ? 'RESPONDED' : normalizePipelineStage(currentStage),
          },
          idToken
        );

        // Candidate response should stop any active recruiter outreach sequence.
        const seqId = `job_${associatedJobId}__candidate_${pipelineCandidateId}`;
        await upsertDocument('outreachSequences', seqId, {
          status: 'STOPPED',
          stoppedReason: 'CANDIDATE_REPLIED',
          updatedAt: serverTimestamp(),
        });
      }
    };

    const message = {
      ...outbound,
      threadId,
      createdAt: serverTimestamp(),
      read: false
    };
    
    const messageRef = await addDoc(collection(db, 'messages'), message);

    // Persist job on thread for inbox routing. Ensure Firestore rules only allow participants to update threads.
    const threadPatch: Record<string, unknown> = {
      lastMessageAt: serverTimestamp(),
      lastMessagePreview: String(outbound.content || "").slice(0, 240),
      lastMessageSenderId: String(outbound.senderId || ""),
    };
    if (outbound.jobDetails?.jobId) {
      Object.assign(
        threadPatch,
        buildThreadJobPersistPayload(outbound.jobDetails as MessageJobDetailsShape)
      );
    }
    await updateDocument("messageThreads", threadId, threadPatch);

    try {
      await syncPipelineWithMessage();
    } catch (pipelineSyncError) {
      console.error('Failed to sync pipeline from message event:', pipelineSyncError);
    }
    
    if (idToken) {
      try {
        fetch('/api/notifications/message-sent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            threadId,
            senderId: outbound.senderId,
            messageContent: outbound.content.substring(0, 150)
          })
        }).catch(err => console.error('Error triggering message notification:', err));
      } catch (e) {
        // Silent fail
      }
    }
    
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
    })) as any[];
    
    // Sort messages by createdAt on the client side to avoid needing an index
    messages.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt;
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt;
      
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

/**
 * If the thread has no jobId but recent messages include jobDetails, persist onto the thread once.
 */
export const backfillThreadJobFromMessages = async (threadId: string): Promise<boolean> => {
  try {
    const threadRef = doc(db, "messageThreads", threadId);
    const threadSnap = await getDoc(threadRef);
    if (!threadSnap.exists()) return false;
    const existing = threadSnap.data() as Record<string, unknown>;
    if (existing?.jobId) return false;
    const { data: msgs } = await getThreadMessages(threadId);
    const list = (msgs || []) as any[];
    const withJob = [...list].reverse().find((m) => m?.jobDetails?.jobId);
    const jd = withJob?.jobDetails;
    if (!jd?.jobId) return false;
    const payload: MessageJobDetailsShape = {
      jobId: String(jd.jobId),
      jobTitle: String(jd.jobTitle || ""),
      employmentType: String(jd.employmentType || ""),
      location: String(jd.location || ""),
      jobDescription: String(jd.jobDescription || ""),
    };
    await updateDoc(threadRef, {
      ...buildThreadJobPersistPayload(payload),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.error("backfillThreadJobFromMessages", e);
    return false;
  }
};

export const markMessageAsRead = async (messageId: string) => {
  return updateDocument('messages', messageId, { read: true });
};

export const getOrCreateThread = async (
  participantIds: string[],
  options?: { jobDetails?: MessageJobDetailsShape | null }
) => {
  try {
    const q = query(
      collection(db, 'messageThreads'),
      where('participantIds', '==', participantIds)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const thread = querySnapshot.docs[0];
      const tid = thread.id;
      const snap = thread.data() as Record<string, unknown>;
      if (options?.jobDetails?.jobId && !snap?.jobId) {
        try {
          await updateDoc(doc(db, "messageThreads", tid), {
            ...buildThreadJobPersistPayload(options.jobDetails),
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.error("getOrCreateThread job context merge", e);
        }
      }
      return { id: tid, error: null };
    }
    return createMessageThread(participantIds, options?.jobDetails || undefined);
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

export const createMessageThread = async (
  participantIds: string[],
  jobDetails?: MessageJobDetailsShape | null
) => {
  try {
    const threadData: Record<string, unknown> = {
      participantIds,
      acceptedBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
    };
    if (jobDetails?.jobId) {
      Object.assign(threadData, buildThreadJobPersistPayload(jobDetails));
    }

    const docRef = await addDoc(collection(db, "messageThreads"), threadData);
    return { id: docRef.id, error: null };
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

export const acceptMessageThread = async (threadId: string, userId: string) => {
  try {
    const threadRef = doc(db, 'messageThreads', threadId);
    const threadDoc = await getDoc(threadRef);
    
    if (!threadDoc.exists()) {
      return { error: 'Thread not found' };
    }
    
    const threadData = threadDoc.data();
    const acceptedBy = threadData.acceptedBy || [];
    
    if (!acceptedBy.includes(userId)) {
      await updateDoc(threadRef, {
        acceptedBy: [...acceptedBy, userId],
        updatedAt: serverTimestamp()
      });
    }
    
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const trackProfileView = async (candidateId: string, viewerId: string, idToken: string) => {
  try {
    const viewData = {
      candidateId,
      viewerId,
      viewedAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'profileViews'), viewData);
    
    // Trigger notification via API route (non-blocking); requires auth
    try {
      fetch('/api/notifications/profile-viewed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          candidateId,
          viewerId
        })
      }).catch(err => console.error('Error triggering profile view notification:', err));
    } catch (e) {
      // Silent fail
    }
    
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

// Get unique viewer companies for a candidate profile
export const getProfileViewers = async (candidateId: string) => {
  try {
    const q = query(
      collection(db, 'profileViews'),
      where('candidateId', '==', candidateId)
    );
    const querySnapshot = await getDocs(q);
    const viewerIds = new Set<string>();
    const viewers: any[] = [];
    for (const docSnap of querySnapshot.docs) {
      const data: any = docSnap.data();
      if (data.viewerId && !viewerIds.has(data.viewerId)) {
        viewerIds.add(data.viewerId);
        const { data: viewerProfile } = await getDocument('users', data.viewerId);
        if (viewerProfile) {
          viewers.push({ ...viewerProfile, id: data.viewerId });
        }
      }
    }
    return { viewers, count: viewerIds.size, error: null };
  } catch (error: any) {
    return { viewers: [], count: 0, error: error.message };
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

// Get jobs for company (owner sees all, recruiters see theirs + owner's)
export const getCompanyJobs = async (companyId: string, userId: string, isOwner: boolean) => {
  try {
    if (isOwner) {
      // Owner sees ALL jobs for the company
      const q = query(
        collection(db, 'jobs'),
        where('companyId', '==', companyId),
        where('status', '==', 'ACTIVE')
      );
      
      const querySnapshot = await getDocs(q);
      const jobs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { data: jobs, error: null };
    } else {
      // Recruiter sees only their jobs + owner's jobs
      // Get company owner's ID
      const { data: users } = await queryDocuments('users', [
        where('companyId', '==', companyId),
        where('isCompanyOwner', '==', true)
      ]);
      
      const ownerId = users && users.length > 0 ? users[0].id : null;
      
      // Query jobs where employerId is either the recruiter or the owner
      const q = query(
        collection(db, 'jobs'),
        where('companyId', '==', companyId),
        where('status', '==', 'ACTIVE')
      );
      
      const querySnapshot = await getDocs(q);
      const allJobs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter in code: only jobs created by recruiter or owner
      const filteredJobs = allJobs.filter((job: any) => 
        job.employerId === userId || job.employerId === ownerId
      );
      
      return { data: filteredJobs, error: null };
    }
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
    
    // Type assertion for ratings data
    const typedRatings = ratings as any[];
    const totalRating = typedRatings.reduce((sum, rating) => sum + rating.rating, 0);
    const average = totalRating / typedRatings.length;
    
    return { average: Math.round(average * 10) / 10, count: typedRatings.length, error: null };
  } catch (error: any) {
    return { average: 0, count: 0, error: error.message };
  }
};

// Export common Firestore functions for convenience
export { collection, doc, where, orderBy, limit, serverTimestamp };

// ============================================
// COMPANIES
// ============================================

export const createCompany = async (companyData: {
  companyName: string;
  companyBio?: string;
  companyLocation?: string;
  companyWebsite?: string;
  companySize?: string;
  companyIndustry?: string;
  companyFounded?: string;
  bannerImageUrl?: string;
  logoImageUrl?: string;
  createdBy: string;
}) => {
  try {
    const { id, error } = await createDocument('companies', {
      ...companyData,
      createdAt: new Date().toISOString()
    });
    return { id, error };
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

export const getCompany = async (companyId: string) => {
  try {
    const { data, error } = await getDocument('companies', companyId);
    return { data, error };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const updateCompany = async (companyId: string, updates: {
  companyName?: string;
  companyBio?: string;
  companyLocation?: string;
  companyWebsite?: string;
  companySize?: string;
  companyIndustry?: string;
  companyFounded?: string;
  bannerImageUrl?: string;
  logoImageUrl?: string;
}) => {
  try {
    const { error } = await updateDocument('companies', companyId, updates);
    return { error };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const getCompanyRecruiters = async (companyId: string) => {
  try {
    const { data, error } = await queryDocuments('users', [
      where('companyId', '==', companyId),
      where('role', '==', 'RECRUITER')
    ]);
    return { data, error };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

// ============================================
// COMPANY INVITATIONS
// ============================================

export const inviteRecruiter = async (
  companyId: string, 
  invitedEmail: string, 
  invitedBy: string
) => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiration

    const { id, error } = await createDocument('companyInvitations', {
      companyId,
      invitedEmail: invitedEmail.toLowerCase(),
      invitedBy,
      role: 'RECRUITER',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    });
    return { id, error };
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

export const getInvitationByEmail = async (email: string) => {
  try {
    // Query only by email, then filter by status in code
    const { data, error } = await queryDocuments('companyInvitations', [
      where('invitedEmail', '==', email.toLowerCase())
    ]);
    
    if (error) return { data: null, error };
    
    // Filter for pending and non-expired invitations
    const validInvitations = (data || []).filter((inv: any) => {
      if (inv.status !== 'PENDING') return false;
      const expiresAt = new Date(inv.expiresAt);
      return expiresAt > new Date();
    });
    
    return { data: validInvitations.length > 0 ? validInvitations[0] : null, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const getCompanyInvitations = async (companyId: string) => {
  try {
    // Query by companyId only, then filter by status client-side
    // This avoids needing a composite index
    const { data, error } = await queryDocuments('companyInvitations', [
      where('companyId', '==', companyId)
    ]);
    
    if (error) {
      return { data: [], error };
    }
    
    // Filter to only pending invitations
    const pendingInvitations = (data || []).filter(
      (inv: any) => inv.status === 'PENDING'
    );
    
    return { data: pendingInvitations, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

export const acceptInvitation = async (invitationId: string, userId: string) => {
  try {
    const { error } = await updateDocument('companyInvitations', invitationId, {
      status: 'ACCEPTED',
      acceptedAt: new Date().toISOString(),
      acceptedBy: userId
    });
    return { error };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const declineInvitation = async (invitationId: string) => {
  try {
    const { error } = await updateDocument('companyInvitations', invitationId, {
      status: 'DECLINED',
      declinedAt: new Date().toISOString()
    });
    return { error };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const cancelInvitation = async (invitationId: string) => {
  try {
    const { error } = await deleteDocument('companyInvitations', invitationId);
    return { error };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Endorsements
export const createEndorsement = async (userId: string, endorsement: {
  endorserName: string;
  endorserEmail?: string;
  endorserLinkedIn?: string;
  endorserTitle?: string;
  endorserCompany?: string;
  skill: string;
  message?: string;
}, idToken?: string) => {
  try {
    const endorserUserId = auth.currentUser?.uid;
    if (!endorserUserId) {
      return { id: null, error: "You must be signed in to submit an endorsement." };
    }
    if (userId === endorserUserId) {
      return { id: null, error: "You cannot endorse your own profile." };
    }
    const { id, error } = await createDocument('endorsements', {
      userId,
      endorserUserId,
      ...endorsement
    });
    
    if (!error && id && idToken) {
      try {
        fetch('/api/notifications/endorsement-received', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            userId,
            endorserName: endorsement.endorserName,
            skill: endorsement.skill
          })
        }).catch(err => console.error('Error triggering endorsement notification:', err));
      } catch (e) {
        // Silent fail
      }
    }
    
    return { id, error };
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

export const getEndorsements = async (userId: string) => {
  try {
    const { data, error } = await queryDocuments('endorsements', [
      where('userId', '==', userId)
    ]);
    return { data, error };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};
