import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { syncPublicCandidateProfile } from "@/lib/server/public-projections";
import { isServerAdminUser } from "@/lib/admin-access";
import { canUserAccessJob } from "@/lib/matching/job-access";
import { assertCandidateTiedToJob } from "@/lib/interviews/phase3";

export type UploadKind = "resume" | "transcript" | "video" | "profile-image";

export const UPLOAD_CONFIG: Record<UploadKind, { folder: string; maxBytes: number; mime: RegExp; privateFile: boolean }> = {
  resume: { folder: "resumes", maxBytes: 5 * 1024 * 1024, mime: /^application\/pdf$/i, privateFile: true },
  transcript: { folder: "transcripts", maxBytes: 10 * 1024 * 1024, mime: /^(application\/pdf|image\/jpeg|image\/png|image\/webp)$/i, privateFile: true },
  video: { folder: "videos", maxBytes: 100 * 1024 * 1024, mime: /^(video\/mp4|video\/webm|video\/quicktime)$/i, privateFile: true },
  "profile-image": { folder: "profile-images", maxBytes: 5 * 1024 * 1024, mime: /^(image\/jpeg|image\/png|image\/webp)$/i, privateFile: false },
};

function storageBucket() {
  const app = getApps()[0];
  const fromEnv = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined;
  return fromEnv ? getStorage(app).bucket(fromEnv) : getStorage(app).bucket();
}

export async function getAuthedUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const decoded = await adminAuth.verifyIdToken(token);
  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  const user = (userSnap.data() || {}) as Record<string, unknown>;
  return { decoded, user };
}

function safeFileName(name: string) {
  const trimmed = String(name || "").trim() || "upload";
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

function privateFieldsFor(kind: UploadKind) {
  if (kind === "resume") return { path: "resumeStoragePath", fileName: "resumeFileName", mimeType: "resumeMimeType", size: "resumeSizeBytes", uploadedAt: "resumeUploadedAt", legacyUrl: "resumeUrl" };
  if (kind === "transcript") return { path: "transcriptStoragePath", fileName: "transcriptFileName", mimeType: "transcriptMimeType", size: "transcriptSizeBytes", uploadedAt: "transcriptUploadedAt", legacyUrl: "transcriptUrl" };
  if (kind === "video") return { path: "introVideoStoragePath", fileName: "introVideoFileName", mimeType: "introVideoMimeType", size: "introVideoSizeBytes", uploadedAt: "introVideoUploadedAt", legacyUrl: "videoUrl" };
  return { path: "profileImageStoragePath", fileName: "profileImageFileName", mimeType: "profileImageMimeType", size: "profileImageSizeBytes", uploadedAt: "profileImageUploadedAt", legacyUrl: "profileImageUrl" };
}

export async function saveUserFileMetadata(input: { uid: string; kind: UploadKind; storagePath: string; fileName: string; mimeType: string; sizeBytes: number }) {
  const fields = privateFieldsFor(input.kind);
  const publicUrl = input.kind === "profile-image"
    ? `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(storageBucket().name)}/o/${encodeURIComponent(input.storagePath)}?alt=media`
    : "";
  const payload: Record<string, unknown> = {
    [fields.path]: input.storagePath,
    [fields.fileName]: input.fileName,
    [fields.mimeType]: input.mimeType,
    [fields.size]: input.sizeBytes,
    [fields.uploadedAt]: new Date().toISOString(),
    [fields.legacyUrl]: publicUrl,
  };
  await adminDb.collection("users").doc(input.uid).set(payload, { merge: true });
  await syncPublicCandidateProfile(adminDb, input.uid);
  return { publicUrl };
}

export async function clearUserFileMetadata(uid: string, kind: UploadKind) {
  const fields = privateFieldsFor(kind);
  const payload: Record<string, unknown> = {
    [fields.path]: null,
    [fields.fileName]: null,
    [fields.mimeType]: null,
    [fields.size]: null,
    [fields.uploadedAt]: null,
    [fields.legacyUrl]: "",
  };
  await adminDb.collection("users").doc(uid).set(payload, { merge: true });
  await syncPublicCandidateProfile(adminDb, uid);
}

export async function assertEmployerCandidateAccess(input: { request: NextRequest; candidateId: string; allowedJobId?: string | null; threadId?: string | null; poolId?: string | null; }) {
  const authed = await getAuthedUser(input.request);
  if (!authed) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as NextResponse };
  const role = String(authed.user.role || "");
  const isAdmin = role === "ADMIN" || isServerAdminUser(role, authed.decoded.email);
  if (!isAdmin && role !== "EMPLOYER" && role !== "RECRUITER") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) as NextResponse };
  if (isAdmin) return { authed, allowed: true };

  let allowed = false;
  const jobId = String(input.allowedJobId || "").trim();
  const threadId = String(input.threadId || "").trim();
  const poolId = String(input.poolId || "").trim();
  if (jobId) {
    const jobSnap = await adminDb.collection("jobs").doc(jobId).get();
    if (jobSnap.exists) {
      const canAccess = await canUserAccessJob(adminDb, (jobSnap.data() || {}) as Record<string, unknown>, authed.decoded.uid);
      if (canAccess && (await assertCandidateTiedToJob(jobId, input.candidateId))) allowed = true;
    }
  }
  if (!allowed && threadId) {
    const threadSnap = await adminDb.collection("messageThreads").doc(threadId).get();
    if (threadSnap.exists) {
      const td = threadSnap.data() as Record<string, unknown>;
      const participants = Array.isArray(td?.participantIds) ? (td.participantIds as string[]) : [];
      if (participants.includes(authed.decoded.uid) && participants.includes(input.candidateId)) allowed = true;
    }
  }
  if (!allowed && poolId) {
    const poolSnap = await adminDb.collection("talentPools").doc(poolId).get();
    if (poolSnap.exists) {
      const pool = poolSnap.data() as Record<string, unknown>;
      const companyId = String(pool.companyId || "");
      if (companyId && String(authed.user.companyId || "") === companyId) {
        const memberId = `${poolId}_${input.candidateId}`.replace(/\//g, "_");
        const memberSnap = await adminDb.collection("talentPoolMembers").doc(memberId).get();
        if (memberSnap.exists) allowed = true;
      }
    }
  }
  if (!allowed) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) as NextResponse };
  return { authed, allowed: true };
}

export async function createReadSignedUrl(storagePath: string, expiresMinutes = 10) {
  const [url] = await storageBucket().file(storagePath).getSignedUrl({ version: "v4", action: "read", expires: Date.now() + expiresMinutes * 60 * 1000 });
  return url;
}

export async function createWriteSignedUrl(input: { uid: string; fileName: string; mimeType: string; kind: UploadKind }) {
  const cfg = UPLOAD_CONFIG[input.kind];
  const safeName = safeFileName(input.fileName || `${input.kind}-${randomUUID()}`);
  const storagePath = `${cfg.folder}/${input.uid}/${Date.now()}_${safeName}`;
  const [uploadUrl] = await storageBucket().file(storagePath).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 10 * 60 * 1000,
    contentType: input.mimeType,
  });
  return { uploadUrl, storagePath };
}

export async function saveBinaryToStorage(storagePath: string, data: Buffer, mimeType: string) {
  await storageBucket().file(storagePath).save(data, { contentType: mimeType, resumable: false, validation: "crc32c" });
}

export async function deleteFromStorage(storagePath: string) {
  await storageBucket().file(storagePath).delete({ ignoreNotFound: true });
}

/** Verify object exists after client-side upload (e.g. signed PUT) before persisting metadata. */
export async function verifyStorageObjectUploaded(input: {
  storagePath: string;
  allowedContentTypePrefixes: string[];
  minBytes?: number;
}): Promise<{ ok: true; sizeBytes: number; contentType: string } | { ok: false; reason: string }> {
  const file = storageBucket().file(input.storagePath);
  const [exists] = await file.exists();
  if (!exists) return { ok: false, reason: "missing" };
  const [metadata] = await file.getMetadata();
  const sizeBytes = Number(metadata.size ?? 0);
  if (!Number.isFinite(sizeBytes) || sizeBytes < (input.minBytes ?? 1)) {
    return { ok: false, reason: "empty_or_invalid_size" };
  }
  const ct = String(metadata.contentType || "").toLowerCase();
  const allowed = input.allowedContentTypePrefixes.some((p) => ct.startsWith(p.toLowerCase()));
  if (!allowed) return { ok: false, reason: "content_type" };
  return { ok: true, sizeBytes, contentType: ct };
}

